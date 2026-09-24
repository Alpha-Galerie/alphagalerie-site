-- Migration: programa de cashback
--
-- Regra de negócio (ajustável na tabela `configuracoes`, sem deploy):
--   * cashback_percentual         → % do valor pago em produtos que volta como
--                                   crédito (100 = cada R$ 1 gasto vira R$ 1).
--   * cashback_validade_dias      → dias para usar o crédito. Comprou dia 24/09,
--                                   usa até o fim do dia 24/10.
--   * cashback_uso_max_percentual → quanto do próximo pedido o crédito pode
--                                   pagar (50 = no máximo metade). Com 100 o
--                                   cliente poderia levar tudo de graça.
--
-- Como funciona:
--   1. O cliente é identificado pelo WhatsApp (só dígitos, sem o 55).
--   2. O crédito nasce quando o pedido passa para pago/enviado/entregue — por
--      webhook do Mercado Pago, pagamento de cartão ou pela retaguarda (Pix).
--      Pedido criado ou pendente não gera nada.
--   3. A base do crédito é o que o cliente pagou em produtos:
--      total − frete. O cashback usado já sai do total, então crédito não gera
--      crédito.
--   4. O uso é descontado na criação do pedido (create_order_with_items), pelo
--      servidor, consumindo primeiro o crédito que vence antes.
--   5. Pedido cancelado/recusado/reembolsado devolve o cashback que usou e
--      estorna o cashback que gerou.

-- ──────────────────────────────────────────────────────────────────────────
-- 1. Configuração
-- ──────────────────────────────────────────────────────────────────────────
INSERT INTO configuracoes (chave, valor, descricao) VALUES
  ('cashback_percentual', '100',
   'Cashback: % do valor pago em produtos que volta como crédito (100 = R$ 1 gasto vira R$ 1)'),
  ('cashback_validade_dias', '30',
   'Cashback: dias para usar o crédito depois do pagamento'),
  ('cashback_uso_max_percentual', '50',
   'Cashback: % máximo do pedido que pode ser pago com crédito (0 desliga o uso)')
ON CONFLICT (chave) DO NOTHING;

-- ──────────────────────────────────────────────────────────────────────────
-- 2. Colunas no pedido
-- ──────────────────────────────────────────────────────────────────────────
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS frete NUMERIC(10, 2) DEFAULT 0;
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS cashback_usado NUMERIC(10, 2) NOT NULL DEFAULT 0;

-- ──────────────────────────────────────────────────────────────────────────
-- 3. Tabelas
-- ──────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cashback_creditos (
  id BIGSERIAL PRIMARY KEY,
  whatsapp TEXT NOT NULL,
  pedido_id BIGINT NOT NULL UNIQUE REFERENCES pedidos(id) ON DELETE CASCADE,
  valor NUMERIC(10, 2) NOT NULL CHECK (valor > 0),
  saldo NUMERIC(10, 2) NOT NULL CHECK (saldo >= 0),
  expira_em TIMESTAMPTZ NOT NULL,
  estornado BOOLEAN NOT NULL DEFAULT false,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cashback_creditos_whatsapp
  ON cashback_creditos (whatsapp, expira_em)
  WHERE saldo > 0 AND NOT estornado;

CREATE TABLE IF NOT EXISTS cashback_usos (
  id BIGSERIAL PRIMARY KEY,
  pedido_id BIGINT NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
  credito_id BIGINT NOT NULL REFERENCES cashback_creditos(id) ON DELETE CASCADE,
  valor NUMERIC(10, 2) NOT NULL CHECK (valor > 0),
  devolvido BOOLEAN NOT NULL DEFAULT false,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cashback_usos_pedido ON cashback_usos (pedido_id);
CREATE INDEX IF NOT EXISTS idx_cashback_usos_credito ON cashback_usos (credito_id);

-- Só a retaguarda enxerga os lançamentos. A loja consulta saldo pela função
-- consultar_cashback(), que devolve apenas o valor do WhatsApp informado.
ALTER TABLE cashback_creditos ENABLE ROW LEVEL SECURITY;
ALTER TABLE cashback_usos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS cashback_creditos_admin_all ON cashback_creditos;
CREATE POLICY cashback_creditos_admin_all ON cashback_creditos
  FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS cashback_usos_admin_all ON cashback_usos;
CREATE POLICY cashback_usos_admin_all ON cashback_usos
  FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- ──────────────────────────────────────────────────────────────────────────
-- 4. Funções auxiliares
-- ──────────────────────────────────────────────────────────────────────────

-- (11) 99999-9999, 5511999999999 e +55 11 99999-9999 viram 11999999999.
CREATE OR REPLACE FUNCTION normalizar_whatsapp(p TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
SET search_path = public, pg_catalog
AS $$
  SELECT CASE
    WHEN d ~ '^55\d{10,11}$' THEN substr(d, 3)
    ELSE d
  END
  FROM (SELECT regexp_replace(coalesce(p, ''), '\D', '', 'g') AS d) s;
$$;

CREATE OR REPLACE FUNCTION cashback_config(p_chave TEXT, p_padrao NUMERIC)
RETURNS NUMERIC
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_valor NUMERIC;
BEGIN
  SELECT trim(both '"' from valor::text)::NUMERIC INTO v_valor
  FROM configuracoes WHERE chave = p_chave;
  RETURN coalesce(v_valor, p_padrao);
EXCEPTION WHEN OTHERS THEN
  RETURN p_padrao;
END;
$$;

-- Regras públicas do programa, para o site montar os textos.
CREATE OR REPLACE FUNCTION cashback_regras()
RETURNS TABLE (percentual NUMERIC, validade_dias INTEGER, uso_max_percentual NUMERIC)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  SELECT
    cashback_config('cashback_percentual', 100),
    cashback_config('cashback_validade_dias', 30)::INTEGER,
    cashback_config('cashback_uso_max_percentual', 50);
$$;

-- Saldo disponível de um WhatsApp e o vencimento mais próximo.
CREATE OR REPLACE FUNCTION consultar_cashback(p_whatsapp TEXT)
RETURNS TABLE (saldo NUMERIC, proximo_vencimento TIMESTAMPTZ, valor_vencendo NUMERIC)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  WITH ativos AS (
    SELECT c.saldo, c.expira_em
    FROM cashback_creditos c
    WHERE c.whatsapp = normalizar_whatsapp(p_whatsapp)
      AND length(normalizar_whatsapp(p_whatsapp)) >= 10
      AND NOT c.estornado
      AND c.saldo > 0
      AND c.expira_em > NOW()
  )
  SELECT
    coalesce(sum(a.saldo), 0)::NUMERIC,
    min(a.expira_em),
    coalesce(sum(a.saldo) FILTER (WHERE a.expira_em = (SELECT min(expira_em) FROM ativos)), 0)::NUMERIC
  FROM ativos a;
$$;

-- ──────────────────────────────────────────────────────────────────────────
-- 5. Crédito e estorno conforme o status do pedido
-- ──────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION cashback_ao_mudar_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  c_pagos      CONSTANT TEXT[] := ARRAY['pago', 'enviado', 'entregue'];
  c_cancelados CONSTANT TEXT[] := ARRAY['cancelado', 'recusado', 'reembolsado'];
  v_era_pago      BOOLEAN := coalesce(OLD.status = ANY (c_pagos), false);
  v_e_pago        BOOLEAN := coalesce(NEW.status = ANY (c_pagos), false);
  v_era_cancelado BOOLEAN := coalesce(OLD.status = ANY (c_cancelados), false);
  v_e_cancelado   BOOLEAN := coalesce(NEW.status = ANY (c_cancelados), false);
  v_whatsapp TEXT;
  v_base     NUMERIC;
  v_valor    NUMERIC;
  v_expira   TIMESTAMPTZ;
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;

  -- Pagou: gera (ou reativa) o crédito deste pedido.
  IF v_e_pago AND NOT v_era_pago THEN
    v_whatsapp := normalizar_whatsapp(NEW.cliente_whatsapp);
    v_base := greatest(coalesce(NEW.total, 0) - coalesce(NEW.frete, 0), 0);
    v_valor := round(v_base * cashback_config('cashback_percentual', 100) / 100, 2);
    -- Válido até o fim do dia, no horário de Brasília: pago em 24/09 com 30
    -- dias de validade, usa até 24/10 às 23:59.
    v_expira := (((NOW() AT TIME ZONE 'America/Sao_Paulo')::DATE
                  + cashback_config('cashback_validade_dias', 30)::INTEGER + 1)::TIMESTAMP)
                AT TIME ZONE 'America/Sao_Paulo';

    IF v_valor > 0 AND length(v_whatsapp) >= 10 THEN
      INSERT INTO cashback_creditos (whatsapp, pedido_id, valor, saldo, expira_em)
      VALUES (v_whatsapp, NEW.id, v_valor, v_valor, v_expira)
      ON CONFLICT (pedido_id) DO UPDATE
        SET estornado = false,
            saldo = greatest(
              cashback_creditos.valor - coalesce((
                SELECT sum(u.valor) FROM cashback_usos u
                WHERE u.credito_id = cashback_creditos.id AND NOT u.devolvido
              ), 0),
              0)
        WHERE cashback_creditos.estornado;
    END IF;
  END IF;

  -- Cancelou: devolve o que usou e estorna o que ganhou.
  IF v_e_cancelado AND NOT v_era_cancelado THEN
    UPDATE cashback_creditos c
       SET saldo = c.saldo + u.total
      FROM (
        SELECT credito_id, sum(valor) AS total
        FROM cashback_usos
        WHERE pedido_id = NEW.id AND NOT devolvido
        GROUP BY credito_id
      ) u
     WHERE c.id = u.credito_id
       AND NOT c.estornado;

    UPDATE cashback_usos SET devolvido = true
     WHERE pedido_id = NEW.id AND NOT devolvido;

    UPDATE cashback_creditos
       SET saldo = 0, estornado = true
     WHERE pedido_id = NEW.id AND NOT estornado;
  END IF;

  -- Reativou um pedido cancelado: volta a consumir o cashback que ele usava.
  IF v_era_cancelado AND NOT v_e_cancelado THEN
    UPDATE cashback_creditos c
       SET saldo = greatest(c.saldo - u.total, 0)
      FROM (
        SELECT credito_id, sum(valor) AS total
        FROM cashback_usos
        WHERE pedido_id = NEW.id AND devolvido
        GROUP BY credito_id
      ) u
     WHERE c.id = u.credito_id;

    UPDATE cashback_usos SET devolvido = false
     WHERE pedido_id = NEW.id AND devolvido;
  END IF;

  RETURN NEW;
END;
$$;

-- Só UPDATE: um INSERT anônimo já com status "pago" não pode gerar crédito.
DROP TRIGGER IF EXISTS trg_cashback_status ON pedidos;
CREATE TRIGGER trg_cashback_status
  AFTER UPDATE OF status ON pedidos
  FOR EACH ROW EXECUTE FUNCTION cashback_ao_mudar_status();

-- ──────────────────────────────────────────────────────────────────────────
-- 6. Criação do pedido com uso de cashback
-- ──────────────────────────────────────────────────────────────────────────
-- A assinatura ganha p_frete e p_usar_cashback. Remove a antiga para não ficar
-- com duas sobrecargas (o PostgREST não escolhe entre elas).
DROP FUNCTION IF EXISTS create_order_with_items(
  TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, NUMERIC, NUMERIC, JSONB
);

CREATE OR REPLACE FUNCTION create_order_with_items(
  p_numero TEXT,
  p_cliente_nome TEXT,
  p_cliente_whatsapp TEXT,
  p_cliente_email TEXT DEFAULT NULL,
  p_cliente_endereco TEXT DEFAULT NULL,
  p_forma_pagamento TEXT DEFAULT 'pix',
  p_tipo_entrega TEXT DEFAULT 'sedex',
  p_observacoes TEXT DEFAULT NULL,
  p_subtotal NUMERIC DEFAULT 0,
  p_total NUMERIC DEFAULT 0,
  p_itens JSONB DEFAULT '[]'::jsonb,
  p_frete NUMERIC DEFAULT 0,
  p_usar_cashback BOOLEAN DEFAULT false
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_pedido_id BIGINT;
  v_whatsapp TEXT := normalizar_whatsapp(p_cliente_whatsapp);
  v_frete NUMERIC := greatest(coalesce(p_frete, 0), 0);
  v_total NUMERIC := greatest(coalesce(p_total, 0), 0);
  v_limite NUMERIC := 0;
  v_restante NUMERIC := 0;
  v_usado NUMERIC := 0;
  v_parte NUMERIC;
  v_credito RECORD;
BEGIN
  IF p_numero IS NULL OR p_numero = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Order number required', 'code', 'INVALID_NUMERO');
  END IF;

  IF p_cliente_nome IS NULL OR p_cliente_nome = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Customer name required', 'code', 'INVALID_NOME');
  END IF;

  IF EXISTS (SELECT 1 FROM pedidos WHERE numero = p_numero) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Order number already exists', 'code', 'DUPLICATE_NUMERO');
  END IF;

  BEGIN
    -- Quanto do cashback pode entrar: limitado ao teto do programa sobre o
    -- valor dos produtos (frete fora) e ao saldo do cliente.
    IF p_usar_cashback AND length(v_whatsapp) >= 10 THEN
      v_limite := round(
        greatest(v_total - v_frete, 0)
          * cashback_config('cashback_uso_max_percentual', 50) / 100,
        2);
      v_restante := v_limite;
    END IF;

    INSERT INTO pedidos (
      numero, cliente_nome, cliente_whatsapp, cliente_email,
      cliente_endereco, forma_pagamento, tipo_entrega,
      observacoes, subtotal, frete, total, cashback_usado, status
    ) VALUES (
      p_numero,
      p_cliente_nome,
      p_cliente_whatsapp,
      NULLIF(p_cliente_email, ''),
      p_cliente_endereco,
      p_forma_pagamento,
      p_tipo_entrega,
      p_observacoes,
      p_subtotal,
      v_frete,
      v_total,
      0,
      'pendente'
    )
    RETURNING id INTO v_pedido_id;

    -- Consome primeiro o crédito que vence antes. FOR UPDATE impede que dois
    -- pedidos simultâneos gastem o mesmo saldo.
    IF v_restante > 0 THEN
      FOR v_credito IN
        SELECT id, saldo
        FROM cashback_creditos
        WHERE whatsapp = v_whatsapp
          AND NOT estornado
          AND saldo > 0
          AND expira_em > NOW()
        ORDER BY expira_em, id
        FOR UPDATE
      LOOP
        EXIT WHEN v_restante <= 0;
        v_parte := least(v_credito.saldo, v_restante);
        UPDATE cashback_creditos SET saldo = saldo - v_parte WHERE id = v_credito.id;
        INSERT INTO cashback_usos (pedido_id, credito_id, valor)
        VALUES (v_pedido_id, v_credito.id, v_parte);
        v_usado := v_usado + v_parte;
        v_restante := v_restante - v_parte;
      END LOOP;

      IF v_usado > 0 THEN
        v_total := v_total - v_usado;
        UPDATE pedidos SET total = v_total, cashback_usado = v_usado WHERE id = v_pedido_id;
      END IF;
    END IF;

    INSERT INTO pedido_itens (
      pedido_id, produto_id, produto_nome, produto_codigo,
      quantidade, preco_unitario, subtotal, variacao_id
    )
    SELECT
      v_pedido_id,
      (item->>'produto_id')::BIGINT,
      item->>'produto_nome',
      item->>'produto_codigo',
      (item->>'quantidade')::INTEGER,
      (item->>'preco_unitario')::NUMERIC,
      (item->>'subtotal')::NUMERIC,
      CASE
        WHEN item->>'variacao_id' = 'null' OR item->>'variacao_id' = ''
        THEN NULL
        ELSE (item->>'variacao_id')::BIGINT
      END
    FROM jsonb_array_elements(p_itens) AS item
    WHERE item->>'produto_nome' IS NOT NULL;

    RETURN jsonb_build_object(
      'success', true,
      'id', v_pedido_id,
      'numero', p_numero,
      'status', 'pendente',
      'total', v_total,
      'cashback_usado', v_usado,
      'created_at', NOW()::text,
      'total_items', (SELECT count(*) FROM pedido_itens WHERE pedido_id = v_pedido_id)
    );

  EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'code', SQLSTATE,
      'hint', 'Check FK constraints and data types'
    );
  END;
END;
$$;

-- ──────────────────────────────────────────────────────────────────────────
-- 7. Permissões
-- ──────────────────────────────────────────────────────────────────────────
REVOKE ALL ON FUNCTION cashback_ao_mudar_status() FROM PUBLIC;
REVOKE ALL ON FUNCTION cashback_config(TEXT, NUMERIC) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION normalizar_whatsapp(TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION cashback_regras() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION consultar_cashback(TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION create_order_with_items(
  TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, NUMERIC, NUMERIC, JSONB, NUMERIC, BOOLEAN
) TO anon, authenticated, service_role;
