-- Painel do operador (/operador)
--
-- Quem toca o online no dia a dia (atende o WhatsApp, separa, embala e manda)
-- entra com um login próprio, de papel `operador`, e vê só o que precisa
-- para operar:
--   * os pedidos pagos para separar e entregar, com itens e endereço;
--   * o estoque com preços, para montar pedido manual;
--   * o pedido manual do WhatsApp, que nasce aguardando o Pix.
--
-- Faturamento, totais, relatórios, cupons e cadastro continuam só na
-- retaguarda do dono: o operador não tem `is_admin()`, então as políticas
-- de escrita das tabelas seguem fechadas para ele, e tudo passa por estas
-- funções, que conferem o papel e fazem só o permitido.
--
-- O operador nunca marca um pedido como pago: o Pix cai na conta da loja e
-- quem confirma é o dono (ou o Mercado Pago, no cartão). Assim a baixa de
-- estoque e a comissão saem só de venda que entrou de verdade.
--
-- Papel: auth.users.raw_app_meta_data->>'role' = 'operador'. O admin também
-- passa nas funções, para o dono conseguir abrir e conferir o painel.

ALTER TABLE pedidos
  ADD COLUMN IF NOT EXISTS origem TEXT NOT NULL DEFAULT 'site';

COMMENT ON COLUMN pedidos.origem IS
  'site = checkout do site; operador = pedido manual lançado no painel do operador.';

CREATE OR REPLACE FUNCTION is_operador()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SET search_path = public, pg_catalog
AS $$
  SELECT coalesce((auth.jwt() -> 'app_metadata' ->> 'role') IN ('operador', 'admin'), false)
      OR auth.role() = 'service_role';
$$;

-- ── pedidos ─────────────────────────────────────────────────────────────
-- Pagos, enviados e entregues dos últimos `p_dias`, mais os manuais do
-- próprio painel (inclusive aguardando Pix ou cancelados). Sem total nem
-- subtotal: o valor só aparece no manual aguardando Pix, para reenviar a
-- cobrança ao cliente.
CREATE OR REPLACE FUNCTION operador_pedidos(p_dias INTEGER DEFAULT 30)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  IF NOT is_operador() THEN
    RAISE EXCEPTION 'Acesso restrito ao operador.' USING ERRCODE = '42501';
  END IF;

  RETURN coalesce((
    SELECT jsonb_agg(linha ORDER BY (linha ->> 'criado_em') DESC)
      FROM (
        SELECT jsonb_build_object(
                 'id', p.id,
                 'numero', p.numero,
                 'criado_em', p.criado_em,
                 'status', p.status,
                 'status_nome', coalesce(s.nome, p.status),
                 'status_cor', s.cor,
                 'base', status_base(p.status),
                 'origem', p.origem,
                 'cliente_nome', p.cliente_nome,
                 'cliente_whatsapp', p.cliente_whatsapp,
                 'cliente_endereco', p.cliente_endereco,
                 'tipo_entrega', p.tipo_entrega,
                 'forma_pagamento', p.forma_pagamento,
                 'observacoes', p.observacoes,
                 'valor_pix', CASE
                   WHEN p.origem = 'operador'
                    AND status_base(p.status) IN ('novo', 'aguardando_pagamento')
                   THEN p.total END,
                 'itens', coalesce((
                   SELECT jsonb_agg(jsonb_build_object(
                            'nome', i.produto_nome,
                            'variacao', v.nome,
                            'codigo', i.produto_codigo,
                            'quantidade', i.quantidade
                          ) ORDER BY i.id)
                     FROM pedido_itens i
                     LEFT JOIN variacoes v ON v.id = i.variacao_id
                    WHERE i.pedido_id = p.id
                 ), '[]'::jsonb)
               ) AS linha
          FROM pedidos p
          LEFT JOIN pedido_status s ON s.slug = p.status
         WHERE p.criado_em >= now() - make_interval(days => greatest(coalesce(p_dias, 30), 1))
           AND (
                 status_base(p.status) IN ('pago', 'enviado', 'entregue')
              OR (p.origem = 'operador'
                  AND status_base(p.status) IN ('novo', 'aguardando_pagamento', 'cancelado'))
           )
         ORDER BY p.criado_em DESC
         LIMIT 300
      ) t
  ), '[]'::jsonb);
END;
$$;

-- ── status ──────────────────────────────────────────────────────────────
-- O operador anda com o pedido pago (aguardando coleta → enviado →
-- entregue) e pode cancelar o manual que ainda não foi pago. Os triggers de
-- estoque e do clube rodam como em qualquer mudança de status.
CREATE OR REPLACE FUNCTION operador_mudar_status(p_pedido BIGINT, p_status TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_pedido pedidos%ROWTYPE;
  v_base TEXT;
BEGIN
  IF NOT is_operador() THEN
    RAISE EXCEPTION 'Acesso restrito ao operador.' USING ERRCODE = '42501';
  END IF;

  IF p_status NOT IN ('aguardando_coleta', 'enviado', 'entregue', 'cancelado')
     OR NOT EXISTS (SELECT 1 FROM pedido_status WHERE slug = p_status) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Status não permitido no painel.');
  END IF;

  SELECT * INTO v_pedido FROM pedidos WHERE id = p_pedido FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Pedido não encontrado.');
  END IF;
  v_base := status_base(v_pedido.status);

  IF p_status = 'cancelado' THEN
    IF v_pedido.origem <> 'operador' OR v_base NOT IN ('novo', 'aguardando_pagamento') THEN
      RETURN jsonb_build_object('success', false,
        'error', 'Só dá para cancelar pedido manual que ainda não foi pago. Fale com o dono.');
    END IF;
  ELSIF v_base NOT IN ('pago', 'enviado', 'entregue') THEN
    RETURN jsonb_build_object('success', false,
      'error', 'O pedido ainda não foi pago. Aguarde a confirmação do pagamento.');
  END IF;

  UPDATE pedidos SET status = p_status WHERE id = p_pedido;
  RETURN jsonb_build_object('success', true);
END;
$$;

-- ── estoque ─────────────────────────────────────────────────────────────
-- Produtos ativos com quantidade, preço e variações. Só leitura: o estoque
-- mexe pelos pedidos, e acerto de contagem é com o dono na retaguarda.
CREATE OR REPLACE FUNCTION operador_produtos()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  IF NOT is_operador() THEN
    RAISE EXCEPTION 'Acesso restrito ao operador.' USING ERRCODE = '42501';
  END IF;

  RETURN coalesce((
    SELECT jsonb_agg(jsonb_build_object(
             'id', p.id,
             'codigo', p.codigo,
             'nome', p.nome,
             'marca', p.marca,
             'subcategoria', p.subcategoria,
             'preco', p.preco,
             'preco_pix', p.preco_pix,
             'preco_promocional', p.preco_promocional,
             'estoque', p.estoque,
             'imagem_url', p.imagem_url,
             'variacoes', coalesce((
               SELECT jsonb_agg(jsonb_build_object(
                        'id', v.id, 'nome', v.nome, 'preco', v.preco, 'estoque', v.estoque
                      ) ORDER BY v.ordem, v.id)
                 FROM variacoes v
                WHERE v.produto_id = p.id AND v.ativo
             ), '[]'::jsonb)
           ) ORDER BY p.nome)
      FROM produtos p
     WHERE p.ativo
  ), '[]'::jsonb);
END;
$$;

-- Preço no Pix, a mesma regra do site (src/lib/preco.ts): variação com
-- preço próprio manda; senão o promocional quando menor que o cheio, e o
-- preço Pix quando menor que esse preço de venda.
CREATE OR REPLACE FUNCTION operador_preco_pix(p_produto produtos, p_variacao_preco NUMERIC)
RETURNS NUMERIC
LANGUAGE sql
IMMUTABLE
SET search_path = public, pg_catalog
AS $$
  SELECT CASE
    WHEN p_variacao_preco > 0 THEN p_variacao_preco
    ELSE (
      SELECT CASE WHEN p_produto.preco_pix > 0 AND p_produto.preco_pix < venda
                  THEN p_produto.preco_pix ELSE venda END
        FROM (SELECT CASE WHEN p_produto.preco_promocional > 0
                           AND p_produto.preco_promocional < p_produto.preco
                          THEN p_produto.preco_promocional ELSE p_produto.preco END AS venda) x
    )
  END;
$$;

-- ── pedido manual ───────────────────────────────────────────────────────
-- Pedido que chegou pelo WhatsApp (ou retirada). O preço vem do banco, não
-- do navegador; o estoque é conferido na hora; o pedido nasce aguardando o
-- Pix e só baixa o estoque quando o dono confirmar o pagamento.
--
-- p = { cliente_nome, cliente_whatsapp, cliente_endereco, tipo_entrega
--       (delivery | programada | retirada), frete, observacoes,
--       itens: [{ produto_id, variacao_id, quantidade }] }
CREATE OR REPLACE FUNCTION operador_criar_pedido(p JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_nome TEXT := btrim(coalesce(p ->> 'cliente_nome', ''));
  v_whats TEXT := regexp_replace(coalesce(p ->> 'cliente_whatsapp', ''), '\D', '', 'g');
  v_entrega TEXT := coalesce(p ->> 'tipo_entrega', '');
  v_endereco TEXT := nullif(btrim(coalesce(p ->> 'cliente_endereco', '')), '');
  v_obs TEXT := nullif(btrim(coalesce(p ->> 'observacoes', '')), '');
  v_frete NUMERIC;
  v_item RECORD;
  v_prod produtos%ROWTYPE;
  v_var variacoes%ROWTYPE;
  v_disp INTEGER;
  v_preco NUMERIC;
  v_subtotal NUMERIC := 0;
  v_linhas JSONB := '[]'::jsonb;
  v_pedido_id BIGINT;
  v_numero TEXT;
BEGIN
  IF NOT is_operador() THEN
    RAISE EXCEPTION 'Acesso restrito ao operador.' USING ERRCODE = '42501';
  END IF;

  IF v_nome = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Informe o nome do cliente.');
  END IF;
  IF length(v_whats) < 10 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Informe o WhatsApp do cliente com DDD.');
  END IF;
  IF v_entrega NOT IN ('delivery', 'programada', 'retirada') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Escolha delivery, entrega programada ou retirada.');
  END IF;
  IF v_entrega <> 'retirada' AND v_endereco IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Informe o endereço de entrega.');
  END IF;

  BEGIN
    v_frete := round(coalesce(nullif(p ->> 'frete', '')::NUMERIC, 0), 2);
  EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', 'Valor do frete inválido.');
  END;
  IF v_frete < 0 OR v_frete > 500 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Valor do frete inválido.');
  END IF;
  IF v_entrega = 'retirada' THEN
    v_frete := 0;
  END IF;

  IF jsonb_typeof(p -> 'itens') IS DISTINCT FROM 'array' OR jsonb_array_length(p -> 'itens') = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Adicione pelo menos um produto.');
  END IF;

  -- Junta linhas repetidas do mesmo produto/variação antes de conferir o
  -- estoque, para não passar duas vezes pela mesma quantidade.
  FOR v_item IN
    SELECT (e ->> 'produto_id')::BIGINT AS produto_id,
           nullif(e ->> 'variacao_id', '')::BIGINT AS variacao_id,
           sum((e ->> 'quantidade')::INTEGER)::INTEGER AS quantidade
      FROM jsonb_array_elements(p -> 'itens') e
     GROUP BY 1, 2
     ORDER BY 1, 2
  LOOP
    IF v_item.produto_id IS NULL OR coalesce(v_item.quantidade, 0) < 1 OR v_item.quantidade > 99 THEN
      RETURN jsonb_build_object('success', false, 'error', 'Quantidade inválida em um dos produtos.');
    END IF;

    SELECT * INTO v_prod FROM produtos WHERE id = v_item.produto_id AND ativo FOR UPDATE;
    IF NOT FOUND THEN
      RETURN jsonb_build_object('success', false, 'error', 'Um dos produtos não está mais ativo.');
    END IF;

    IF v_item.variacao_id IS NOT NULL THEN
      SELECT * INTO v_var FROM variacoes
       WHERE id = v_item.variacao_id AND produto_id = v_prod.id AND ativo FOR UPDATE;
      IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', format('A variação de %s não está mais ativa.', v_prod.nome));
      END IF;
      v_disp := v_var.estoque;
      v_preco := operador_preco_pix(v_prod, v_var.preco);
    ELSIF EXISTS (SELECT 1 FROM variacoes WHERE produto_id = v_prod.id AND ativo) THEN
      RETURN jsonb_build_object('success', false, 'error', format('Escolha a variação de %s.', v_prod.nome));
    ELSE
      v_disp := v_prod.estoque;
      v_preco := operador_preco_pix(v_prod, NULL);
    END IF;

    IF v_disp IS NOT NULL AND v_item.quantidade > v_disp THEN
      RETURN jsonb_build_object('success', false,
        'error', format('Sem estoque suficiente de %s%s: tem %s.',
                        v_prod.nome,
                        CASE WHEN v_item.variacao_id IS NOT NULL THEN ' (' || v_var.nome || ')' ELSE '' END,
                        v_disp));
    END IF;
    IF coalesce(v_preco, 0) <= 0 THEN
      RETURN jsonb_build_object('success', false, 'error', format('%s está sem preço cadastrado.', v_prod.nome));
    END IF;

    v_subtotal := v_subtotal + v_preco * v_item.quantidade;
    v_linhas := v_linhas || jsonb_build_object(
      'produto_id', v_prod.id,
      'produto_nome', v_prod.nome,
      'produto_codigo', v_prod.codigo,
      'variacao_id', v_item.variacao_id,
      'variacao', CASE WHEN v_item.variacao_id IS NOT NULL THEN v_var.nome END,
      'quantidade', v_item.quantidade,
      'preco_unitario', v_preco,
      'subtotal', v_preco * v_item.quantidade
    );
  END LOOP;

  v_numero := 'AGM' || (extract(epoch FROM clock_timestamp()) * 1000)::BIGINT;

  INSERT INTO pedidos (numero, cliente_nome, cliente_whatsapp, cliente_endereco,
                       subtotal, frete, total, forma_pagamento, status, observacoes,
                       tipo_entrega, origem)
  VALUES (v_numero, v_nome, v_whats, v_endereco,
          v_subtotal, v_frete, v_subtotal + v_frete, 'pix', 'aguardando_pagamento', v_obs,
          v_entrega, 'operador')
  RETURNING id INTO v_pedido_id;

  INSERT INTO pedido_itens (pedido_id, produto_id, produto_nome, produto_codigo,
                            quantidade, preco_unitario, subtotal, variacao_id)
  SELECT v_pedido_id, (l ->> 'produto_id')::BIGINT, l ->> 'produto_nome', l ->> 'produto_codigo',
         (l ->> 'quantidade')::INTEGER, (l ->> 'preco_unitario')::NUMERIC,
         (l ->> 'subtotal')::NUMERIC, (l ->> 'variacao_id')::BIGINT
    FROM jsonb_array_elements(v_linhas) l;

  RETURN jsonb_build_object(
    'success', true,
    'id', v_pedido_id,
    'numero', v_numero,
    'subtotal', v_subtotal,
    'frete', v_frete,
    'total', v_subtotal + v_frete,
    'itens', v_linhas
  );
END;
$$;

REVOKE ALL ON FUNCTION is_operador() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION operador_pedidos(INTEGER) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION operador_mudar_status(BIGINT, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION operador_produtos() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION operador_preco_pix(produtos, NUMERIC) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION operador_criar_pedido(JSONB) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION is_operador() TO authenticated;
GRANT EXECUTE ON FUNCTION operador_pedidos(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION operador_mudar_status(BIGINT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION operador_produtos() TO authenticated;
GRANT EXECUTE ON FUNCTION operador_criar_pedido(JSONB) TO authenticated;
