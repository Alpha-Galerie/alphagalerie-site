-- Migration: Alpha Club — programa de pontos e fidelidade
--
-- Substitui o cashback em reais (20260924000000_cashback) por pontos, no
-- modelo pedido pela loja. Nenhum crédito do modelo antigo chegou a existir,
-- então as tabelas antigas saem sem conversão.
--
-- Regras (todas editáveis na retaguarda → Config → Alpha Club):
--   clube_ativo                      liga/desliga o programa inteiro
--   clube_nome                       nome exibido no site
--   clube_pontos_por_real            1   → cada R$ 1 pago em produtos = 1 ponto
--   clube_valor_ponto                0.10 → 100 pontos = R$ 10 (10% de volta)
--   clube_validade_dias              365 → cada lote de pontos vence sozinho
--   clube_checkout_max_percentual    10  → no checkout, até 10% dos produtos
--                                         que não estão em promoção
--   clube_cupom_valores              5,10 → cupons de troca (R$)
--   clube_cupom_validade_dias        30
--   clube_cupom_minimo_multiplicador 3   → cupom de R$ 10 pede carrinho de R$ 30
--   clube_bonus_boas_vindas          50  → pontos na primeira compra
--   clube_bonus_aniversario          100 → pontos no mês do aniversário
--   clube_bonus_indicacao            100 → pontos para quem indicou um cliente novo
--
-- Como funciona:
--   * O cliente é o WhatsApp (só dígitos, sem 55). Entra no clube na primeira
--     compra paga; antes disso só guardamos aniversário e quem indicou.
--   * Pontos nascem quando o pedido vira pago/enviado/entregue (site, cartão,
--     Pix confirmado ou pedido manual da retaguarda). Base: o que foi pago em
--     produtos — frete fora, limitado ao subtotal.
--   * Cancelado/recusado/reembolsado devolve os pontos que o pedido usou,
--     estorna os que ele gerou (compra, boas-vindas, indicação) e devolve o
--     uso do cupom.
--   * Usar pontos no checkout não soma com cupom.
--   * Resgatar cupom: troca pontos por um cupom de valor fixo, preso ao
--     WhatsApp do cliente, uso único, com validade e carrinho mínimo.

-- ──────────────────────────────────────────────────────────────────────────
-- 1. Sai o cashback em reais
-- ──────────────────────────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS trg_cashback_status ON pedidos;
DROP FUNCTION IF EXISTS cashback_ao_mudar_status();
DROP FUNCTION IF EXISTS consultar_cashback(TEXT);
DROP FUNCTION IF EXISTS cashback_regras();
DROP FUNCTION IF EXISTS cashback_config(TEXT, NUMERIC);
DROP TABLE IF EXISTS cashback_usos;
DROP TABLE IF EXISTS cashback_creditos;
DELETE FROM configuracoes
 WHERE chave IN ('cashback_percentual', 'cashback_validade_dias', 'cashback_uso_max_percentual');

-- ──────────────────────────────────────────────────────────────────────────
-- 2. Configuração
-- ──────────────────────────────────────────────────────────────────────────
INSERT INTO configuracoes (chave, valor, descricao) VALUES
  ('clube_ativo', 'true', 'Alpha Club: true liga o programa no site; false tira do ar (saldos ficam guardados)'),
  ('clube_nome', 'Alpha Club', 'Alpha Club: nome do programa exibido no site'),
  ('clube_pontos_por_real', '1', 'Alpha Club: pontos por R$ 1 pago em produtos'),
  ('clube_valor_ponto', '0.10', 'Alpha Club: quanto vale 1 ponto em reais (0.10 = 100 pontos valem R$ 10)'),
  ('clube_validade_dias', '365', 'Alpha Club: dias de validade de cada lote de pontos'),
  ('clube_checkout_max_percentual', '10', 'Alpha Club: % máximo dos produtos fora de promoção que os pontos pagam no checkout'),
  ('clube_cupom_valores', '5,10', 'Alpha Club: valores (R$) dos cupons de troca, separados por vírgula'),
  ('clube_cupom_validade_dias', '30', 'Alpha Club: dias de validade do cupom depois da troca'),
  ('clube_cupom_minimo_multiplicador', '3', 'Alpha Club: carrinho mínimo = valor do cupom × este número'),
  ('clube_bonus_boas_vindas', '50', 'Alpha Club: pontos de boas-vindas na primeira compra'),
  ('clube_bonus_aniversario', '100', 'Alpha Club: pontos no mês do aniversário'),
  ('clube_bonus_indicacao', '100', 'Alpha Club: pontos para quem indicou, quando o amigo faz a primeira compra')
ON CONFLICT (chave) DO NOTHING;

-- ──────────────────────────────────────────────────────────────────────────
-- 3. Colunas novas
-- ──────────────────────────────────────────────────────────────────────────
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS frete NUMERIC(10, 2) DEFAULT 0;
-- cashback_usado continua sendo o desconto em R$ que os pontos deram.
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS cashback_usado NUMERIC(10, 2) NOT NULL DEFAULT 0;
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS pontos_usados INTEGER NOT NULL DEFAULT 0;
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS cupom_codigo TEXT;
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS indicado_por TEXT;

-- Cupom do clube: preso a um WhatsApp. Os cupons da loja ficam com NULL.
ALTER TABLE cupons ADD COLUMN IF NOT EXISTS whatsapp TEXT;
ALTER TABLE cupons ADD COLUMN IF NOT EXISTS origem TEXT;

-- ──────────────────────────────────────────────────────────────────────────
-- 4. Tabelas do clube
-- ──────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS clube_membros (
  whatsapp TEXT PRIMARY KEY,
  nome TEXT,
  nascimento_dia SMALLINT CHECK (nascimento_dia BETWEEN 1 AND 31),
  nascimento_mes SMALLINT CHECK (nascimento_mes BETWEEN 1 AND 12),
  indicado_por TEXT,
  primeira_compra_em TIMESTAMPTZ,
  primeira_compra_pedido_id BIGINT REFERENCES pedidos(id) ON DELETE SET NULL,
  aniversario_bonus_ano INTEGER,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Cada linha é um lote de pontos com validade própria.
CREATE TABLE IF NOT EXISTS clube_pontos (
  id BIGSERIAL PRIMARY KEY,
  whatsapp TEXT NOT NULL,
  origem TEXT NOT NULL CHECK (origem IN ('compra', 'boas_vindas', 'aniversario', 'indicacao', 'ajuste')),
  pedido_id BIGINT REFERENCES pedidos(id) ON DELETE CASCADE,
  pontos INTEGER NOT NULL CHECK (pontos > 0),
  saldo INTEGER NOT NULL CHECK (saldo >= 0),
  expira_em TIMESTAMPTZ NOT NULL,
  estornado BOOLEAN NOT NULL DEFAULT false,
  obs TEXT,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_clube_pontos_pedido_origem
  ON clube_pontos (pedido_id, origem) WHERE pedido_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_clube_pontos_whatsapp
  ON clube_pontos (whatsapp, expira_em) WHERE saldo > 0 AND NOT estornado;

-- Para onde os pontos foram: um pedido, um cupom ou um ajuste da loja.
CREATE TABLE IF NOT EXISTS clube_pontos_usos (
  id BIGSERIAL PRIMARY KEY,
  lote_id BIGINT NOT NULL REFERENCES clube_pontos(id) ON DELETE CASCADE,
  pedido_id BIGINT REFERENCES pedidos(id) ON DELETE CASCADE,
  cupom_id BIGINT REFERENCES cupons(id) ON DELETE SET NULL,
  motivo TEXT NOT NULL,
  pontos INTEGER NOT NULL CHECK (pontos > 0),
  devolvido BOOLEAN NOT NULL DEFAULT false,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_clube_usos_pedido ON clube_pontos_usos (pedido_id);
CREATE INDEX IF NOT EXISTS idx_clube_usos_lote ON clube_pontos_usos (lote_id);

ALTER TABLE clube_membros ENABLE ROW LEVEL SECURITY;
ALTER TABLE clube_pontos ENABLE ROW LEVEL SECURITY;
ALTER TABLE clube_pontos_usos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS clube_membros_admin_all ON clube_membros;
CREATE POLICY clube_membros_admin_all ON clube_membros
  FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
DROP POLICY IF EXISTS clube_pontos_admin_all ON clube_pontos;
CREATE POLICY clube_pontos_admin_all ON clube_pontos
  FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
DROP POLICY IF EXISTS clube_usos_admin_all ON clube_pontos_usos;
CREATE POLICY clube_usos_admin_all ON clube_pontos_usos
  FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- ──────────────────────────────────────────────────────────────────────────
-- 5. Leitura da configuração
-- ──────────────────────────────────────────────────────────────────────────
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

CREATE OR REPLACE FUNCTION clube_num(p_chave TEXT, p_padrao NUMERIC)
RETURNS NUMERIC
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v NUMERIC;
BEGIN
  SELECT replace(trim(both '"' from trim(valor::text)), ',', '.')::NUMERIC INTO v
  FROM configuracoes WHERE chave = p_chave;
  RETURN coalesce(v, p_padrao);
EXCEPTION WHEN OTHERS THEN
  RETURN p_padrao;
END;
$$;

CREATE OR REPLACE FUNCTION clube_ativo()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  SELECT coalesce(
    (SELECT lower(trim(both '"' from trim(valor::text))) IN ('true', '1', 'sim', 'on', 'ligado')
       FROM configuracoes WHERE chave = 'clube_ativo'),
    false);
$$;

-- "5,10" → {5,10}; ignora o que não for número positivo.
CREATE OR REPLACE FUNCTION clube_cupom_valores()
RETURNS NUMERIC[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  SELECT coalesce(array_agg(DISTINCT v ORDER BY v), '{}')
  FROM (
    SELECT trim(x)::NUMERIC AS v
    FROM configuracoes c,
         regexp_split_to_table(trim(both '"' from c.valor::text), '[;,[:space:]]+') AS x
    WHERE c.chave = 'clube_cupom_valores'
      AND trim(x) ~ '^[0-9]+([.][0-9]+)?$'
  ) s
  WHERE v > 0;
$$;

-- Regras públicas: o site monta os textos e as contas a partir daqui.
CREATE OR REPLACE FUNCTION clube_regras()
RETURNS TABLE (
  ativo BOOLEAN,
  nome TEXT,
  pontos_por_real NUMERIC,
  valor_ponto NUMERIC,
  validade_dias INTEGER,
  checkout_max_percentual NUMERIC,
  cupom_valores NUMERIC[],
  cupom_validade_dias INTEGER,
  cupom_minimo_multiplicador NUMERIC,
  bonus_boas_vindas INTEGER,
  bonus_aniversario INTEGER,
  bonus_indicacao INTEGER
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  SELECT
    clube_ativo(),
    coalesce(nullif(trim((SELECT valor::text FROM configuracoes WHERE chave = 'clube_nome')), ''), 'Alpha Club'),
    clube_num('clube_pontos_por_real', 1),
    clube_num('clube_valor_ponto', 0.10),
    clube_num('clube_validade_dias', 365)::INTEGER,
    clube_num('clube_checkout_max_percentual', 10),
    clube_cupom_valores(),
    clube_num('clube_cupom_validade_dias', 30)::INTEGER,
    clube_num('clube_cupom_minimo_multiplicador', 3),
    clube_num('clube_bonus_boas_vindas', 50)::INTEGER,
    clube_num('clube_bonus_aniversario', 100)::INTEGER,
    clube_num('clube_bonus_indicacao', 100)::INTEGER;
$$;

-- Fim do dia (horário de Brasília) daqui a N dias.
CREATE OR REPLACE FUNCTION clube_fim_do_dia(p_dias INTEGER)
RETURNS TIMESTAMPTZ
LANGUAGE sql
STABLE
SET search_path = public, pg_catalog
AS $$
  SELECT ((((NOW() AT TIME ZONE 'America/Sao_Paulo')::DATE + p_dias + 1)::TIMESTAMP)
          AT TIME ZONE 'America/Sao_Paulo');
$$;

-- ──────────────────────────────────────────────────────────────────────────
-- 6. Movimentação de pontos (internas)
-- ──────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION clube_saldo(p_whatsapp TEXT)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  SELECT coalesce(sum(saldo), 0)::INTEGER
  FROM clube_pontos
  WHERE whatsapp = p_whatsapp AND NOT estornado AND saldo > 0 AND expira_em > NOW();
$$;

-- Credita um lote. Para lotes ligados a pedido, reativa se tinha sido
-- estornado (pedido cancelado e depois pago de novo).
CREATE OR REPLACE FUNCTION clube_creditar(
  p_whatsapp TEXT, p_origem TEXT, p_pedido_id BIGINT, p_pontos INTEGER, p_obs TEXT DEFAULT NULL
) RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  IF coalesce(p_pontos, 0) <= 0 OR length(coalesce(p_whatsapp, '')) < 10 THEN
    RETURN 0;
  END IF;

  IF p_pedido_id IS NULL THEN
    INSERT INTO clube_pontos (whatsapp, origem, pedido_id, pontos, saldo, expira_em, obs)
    VALUES (p_whatsapp, p_origem, NULL, p_pontos, p_pontos,
            clube_fim_do_dia(clube_num('clube_validade_dias', 365)::INTEGER), p_obs);
    RETURN p_pontos;
  END IF;

  INSERT INTO clube_pontos (whatsapp, origem, pedido_id, pontos, saldo, expira_em, obs)
  VALUES (p_whatsapp, p_origem, p_pedido_id, p_pontos, p_pontos,
          clube_fim_do_dia(clube_num('clube_validade_dias', 365)::INTEGER), p_obs)
  ON CONFLICT (pedido_id, origem) WHERE pedido_id IS NOT NULL DO UPDATE
    SET estornado = false,
        saldo = greatest(
          clube_pontos.pontos - coalesce((
            SELECT sum(u.pontos) FROM clube_pontos_usos u
            WHERE u.lote_id = clube_pontos.id AND NOT u.devolvido
          ), 0)::INTEGER,
          0)
    WHERE clube_pontos.estornado;
  RETURN p_pontos;
END;
$$;

-- Consome pontos, do lote que vence antes. Devolve quantos consumiu.
CREATE OR REPLACE FUNCTION clube_consumir(
  p_whatsapp TEXT, p_pontos INTEGER, p_motivo TEXT,
  p_pedido_id BIGINT DEFAULT NULL, p_cupom_id BIGINT DEFAULT NULL
) RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_restante INTEGER := greatest(coalesce(p_pontos, 0), 0);
  v_usado INTEGER := 0;
  v_parte INTEGER;
  v_lote RECORD;
BEGIN
  IF v_restante = 0 THEN
    RETURN 0;
  END IF;

  FOR v_lote IN
    SELECT id, saldo FROM clube_pontos
    WHERE whatsapp = p_whatsapp AND NOT estornado AND saldo > 0 AND expira_em > NOW()
    ORDER BY expira_em, id
    FOR UPDATE
  LOOP
    EXIT WHEN v_restante <= 0;
    v_parte := least(v_lote.saldo, v_restante);
    UPDATE clube_pontos SET saldo = saldo - v_parte WHERE id = v_lote.id;
    INSERT INTO clube_pontos_usos (lote_id, pedido_id, cupom_id, motivo, pontos)
    VALUES (v_lote.id, p_pedido_id, p_cupom_id, p_motivo, v_parte);
    v_usado := v_usado + v_parte;
    v_restante := v_restante - v_parte;
  END LOOP;

  RETURN v_usado;
END;
$$;

-- Bônus de aniversário: uma vez por ano, no mês do aniversário, só para
-- quem já é do clube. Chamado quando o cliente consulta o saldo ou faz pedido.
CREATE OR REPLACE FUNCTION clube_aplicar_aniversario(p_whatsapp TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_hoje DATE := (NOW() AT TIME ZONE 'America/Sao_Paulo')::DATE;
  v_ano INTEGER := extract(year FROM v_hoje)::INTEGER;
  v_bonus INTEGER := clube_num('clube_bonus_aniversario', 100)::INTEGER;
BEGIN
  IF NOT clube_ativo() OR v_bonus <= 0 THEN
    RETURN 0;
  END IF;

  -- O UPDATE marca o ano de forma atômica: duas consultas ao mesmo tempo não
  -- dão o bônus duas vezes.
  UPDATE clube_membros
     SET aniversario_bonus_ano = v_ano
   WHERE whatsapp = p_whatsapp
     AND primeira_compra_em IS NOT NULL
     AND nascimento_mes = extract(month FROM v_hoje)
     AND aniversario_bonus_ano IS DISTINCT FROM v_ano;
  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  RETURN clube_creditar(p_whatsapp, 'aniversario', NULL, v_bonus, 'Aniversário ' || v_ano);
END;
$$;

-- ──────────────────────────────────────────────────────────────────────────
-- 7. Pontos conforme o status do pedido
-- ──────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION clube_ao_mudar_status()
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
  v_base NUMERIC;
  v_membro clube_membros%ROWTYPE;
  v_cliente_novo BOOLEAN;
  v_indicou TEXT;
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;

  -- O clube nunca pode travar a retaguarda: se algo falhar aqui, a mudança
  -- de status passa mesmo assim e o erro fica no log do banco.
  BEGIN

  -- Pagou: pontos da compra e, se for a primeira, boas-vindas e indicação.
  IF v_e_pago AND NOT v_era_pago AND clube_ativo() THEN
    v_whatsapp := normalizar_whatsapp(NEW.cliente_whatsapp);
    IF length(v_whatsapp) >= 10 THEN
      v_base := greatest(coalesce(NEW.total, 0) - coalesce(NEW.frete, 0), 0);
      -- Pedidos antigos não gravavam frete; o subtotal é o teto.
      IF coalesce(NEW.subtotal, 0) > 0 THEN
        v_base := least(v_base, NEW.subtotal);
      END IF;
      PERFORM clube_creditar(v_whatsapp, 'compra', NEW.id,
        floor(v_base * clube_num('clube_pontos_por_real', 1))::INTEGER);

      INSERT INTO clube_membros (whatsapp, nome)
      VALUES (v_whatsapp, nullif(trim(NEW.cliente_nome), ''))
      ON CONFLICT (whatsapp) DO UPDATE
        SET nome = coalesce(clube_membros.nome, EXCLUDED.nome);
      SELECT * INTO v_membro FROM clube_membros WHERE whatsapp = v_whatsapp FOR UPDATE;

      IF v_membro.primeira_compra_em IS NULL THEN
        -- Cliente novo de verdade: nunca teve pedido pago na loja.
        v_cliente_novo := NOT EXISTS (
          SELECT 1 FROM pedidos p
          WHERE p.id <> NEW.id
            AND p.status = ANY (c_pagos)
            AND normalizar_whatsapp(p.cliente_whatsapp) = v_whatsapp
        );

        UPDATE clube_membros
           SET primeira_compra_em = NOW(), primeira_compra_pedido_id = NEW.id
         WHERE whatsapp = v_whatsapp;

        PERFORM clube_creditar(v_whatsapp, 'boas_vindas', NEW.id,
          clube_num('clube_bonus_boas_vindas', 50)::INTEGER, 'Boas-vindas ao clube');

        v_indicou := coalesce(nullif(NEW.indicado_por, ''), v_membro.indicado_por);
        IF v_cliente_novo AND length(coalesce(v_indicou, '')) >= 10 AND v_indicou <> v_whatsapp
           AND EXISTS (SELECT 1 FROM clube_membros m
                       WHERE m.whatsapp = v_indicou AND m.primeira_compra_em IS NOT NULL) THEN
          PERFORM clube_creditar(v_indicou, 'indicacao', NEW.id,
            clube_num('clube_bonus_indicacao', 100)::INTEGER, 'Indicou ' || v_whatsapp);
        END IF;
      END IF;

      -- Entrou no clube no mês do aniversário: o bônus já vale.
      PERFORM clube_aplicar_aniversario(v_whatsapp);
    END IF;
  END IF;

  -- Cancelou: devolve o que usou, estorna o que gerou, devolve o cupom.
  IF v_e_cancelado AND NOT v_era_cancelado THEN
    UPDATE clube_pontos l
       SET saldo = l.saldo + u.total
      FROM (
        SELECT lote_id, sum(pontos)::INTEGER AS total
        FROM clube_pontos_usos
        WHERE pedido_id = NEW.id AND NOT devolvido
        GROUP BY lote_id
      ) u
     WHERE l.id = u.lote_id AND NOT l.estornado;

    UPDATE clube_pontos_usos SET devolvido = true
     WHERE pedido_id = NEW.id AND NOT devolvido;

    UPDATE clube_pontos SET saldo = 0, estornado = true
     WHERE pedido_id = NEW.id AND NOT estornado;

    -- A primeira compra não valeu: a próxima paga volta a ser a primeira.
    UPDATE clube_membros
       SET primeira_compra_em = NULL, primeira_compra_pedido_id = NULL
     WHERE primeira_compra_pedido_id = NEW.id;

    IF coalesce(NEW.cupom_codigo, '') <> '' THEN
      UPDATE cupons SET usos = greatest(usos - 1, 0)
       WHERE upper(codigo) = upper(NEW.cupom_codigo);
    END IF;
  END IF;

  -- Reativou um pedido cancelado: volta a consumir pontos e cupom.
  IF v_era_cancelado AND NOT v_e_cancelado THEN
    UPDATE clube_pontos l
       SET saldo = greatest(l.saldo - u.total, 0)
      FROM (
        SELECT lote_id, sum(pontos)::INTEGER AS total
        FROM clube_pontos_usos
        WHERE pedido_id = NEW.id AND devolvido
        GROUP BY lote_id
      ) u
     WHERE l.id = u.lote_id;

    UPDATE clube_pontos_usos SET devolvido = false
     WHERE pedido_id = NEW.id AND devolvido;

    IF coalesce(NEW.cupom_codigo, '') <> '' THEN
      UPDATE cupons SET usos = usos + 1
       WHERE upper(codigo) = upper(NEW.cupom_codigo);
    END IF;
  END IF;

  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'alpha club: pedido % (% → %) não processado: % [%]',
      NEW.id, OLD.status, NEW.status, SQLERRM, SQLSTATE;
  END;

  RETURN NEW;
END;
$$;

-- Só UPDATE: um INSERT anônimo já com status "pago" não gera pontos.
DROP TRIGGER IF EXISTS trg_clube_status ON pedidos;
CREATE TRIGGER trg_clube_status
  AFTER UPDATE OF status ON pedidos
  FOR EACH ROW EXECUTE FUNCTION clube_ao_mudar_status();

-- ──────────────────────────────────────────────────────────────────────────
-- 8. Cupons: os do clube ficam presos ao WhatsApp de quem trocou
-- ──────────────────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS validar_cupom(TEXT, NUMERIC);

CREATE OR REPLACE FUNCTION validar_cupom(
  p_codigo TEXT, p_subtotal NUMERIC DEFAULT 0, p_whatsapp TEXT DEFAULT NULL
)
RETURNS TABLE (codigo TEXT, tipo TEXT, valor NUMERIC, descricao TEXT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  SELECT c.codigo, c.tipo, c.valor, c.descricao
  FROM public.cupons c
  WHERE upper(trim(c.codigo)) = upper(trim(p_codigo))
    AND c.ativo
    AND (c.validade    IS NULL OR c.validade >= (NOW() AT TIME ZONE 'America/Sao_Paulo')::DATE)
    AND (c.limite_usos IS NULL OR c.usos < c.limite_usos)
    AND coalesce(p_subtotal, 0) >= coalesce(c.valor_minimo, 0)
    AND (c.whatsapp IS NULL OR c.whatsapp = normalizar_whatsapp(p_whatsapp))
  LIMIT 1;
$$;

-- Troca pontos por cupom de valor fixo.
CREATE OR REPLACE FUNCTION clube_resgatar_cupom(p_whatsapp TEXT, p_valor NUMERIC)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_whatsapp TEXT := normalizar_whatsapp(p_whatsapp);
  v_valor_ponto NUMERIC := clube_num('clube_valor_ponto', 0.10);
  v_custo INTEGER;
  v_usado INTEGER;
  v_codigo TEXT;
  v_cupom_id BIGINT;
  v_validade DATE;
  v_minimo NUMERIC;
BEGIN
  IF NOT clube_ativo() THEN
    RETURN jsonb_build_object('success', false, 'error', 'O clube está pausado no momento.');
  END IF;
  IF length(v_whatsapp) < 10 THEN
    RETURN jsonb_build_object('success', false, 'error', 'WhatsApp inválido.');
  END IF;
  IF NOT (p_valor = ANY (clube_cupom_valores())) OR v_valor_ponto <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Valor de cupom indisponível.');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM clube_membros WHERE whatsapp = v_whatsapp AND primeira_compra_em IS NOT NULL) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Faça sua primeira compra para entrar no clube.');
  END IF;

  v_custo := ceil(p_valor / v_valor_ponto)::INTEGER;
  PERFORM 1 FROM clube_pontos
   WHERE whatsapp = v_whatsapp AND NOT estornado AND saldo > 0 AND expira_em > NOW()
   FOR UPDATE;
  IF clube_saldo(v_whatsapp) < v_custo THEN
    RETURN jsonb_build_object('success', false, 'error', 'Pontos insuficientes.', 'custo', v_custo);
  END IF;

  v_validade := (NOW() AT TIME ZONE 'America/Sao_Paulo')::DATE
                + clube_num('clube_cupom_validade_dias', 30)::INTEGER;
  v_minimo := round(p_valor * clube_num('clube_cupom_minimo_multiplicador', 3), 2);

  LOOP
    v_codigo := 'CLUBE-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM cupons WHERE upper(codigo) = v_codigo);
  END LOOP;

  INSERT INTO cupons (codigo, tipo, valor, descricao, ativo, validade, valor_minimo,
                      limite_usos, usos, whatsapp, origem)
  VALUES (v_codigo, 'fixo', p_valor,
          (SELECT r.nome FROM clube_regras() r) || ': R$ '
            || replace(to_char(p_valor, 'FM999990.00'), '.', ',') || ' de desconto',
          true, v_validade, v_minimo, 1, 0, v_whatsapp, 'clube')
  RETURNING id INTO v_cupom_id;

  v_usado := clube_consumir(v_whatsapp, v_custo, 'cupom', NULL, v_cupom_id);
  IF v_usado < v_custo THEN
    RAISE EXCEPTION 'saldo mudou durante o resgate';
  END IF;

  RETURN jsonb_build_object(
    'success', true, 'codigo', v_codigo, 'valor', p_valor, 'pontos', v_custo,
    'validade', v_validade, 'valor_minimo', v_minimo,
    'saldo', clube_saldo(v_whatsapp));
END;
$$;

-- ──────────────────────────────────────────────────────────────────────────
-- 9. Consulta do cliente (site)
-- ──────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION consultar_clube(p_whatsapp TEXT)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_whatsapp TEXT := normalizar_whatsapp(p_whatsapp);
  v_aniversario INTEGER := 0;
  v_valor_ponto NUMERIC := clube_num('clube_valor_ponto', 0.10);
  v_pontos INTEGER;
  v_membro clube_membros%ROWTYPE;
  v_venc TIMESTAMPTZ;
  v_venc_pontos INTEGER;
BEGIN
  IF length(v_whatsapp) < 10 THEN
    RETURN jsonb_build_object('participante', false, 'pontos', 0, 'valor', 0);
  END IF;

  v_aniversario := clube_aplicar_aniversario(v_whatsapp);
  SELECT * INTO v_membro FROM clube_membros WHERE whatsapp = v_whatsapp;
  v_pontos := clube_saldo(v_whatsapp);

  SELECT min(expira_em) INTO v_venc FROM clube_pontos
   WHERE whatsapp = v_whatsapp AND NOT estornado AND saldo > 0 AND expira_em > NOW();
  SELECT coalesce(sum(saldo), 0)::INTEGER INTO v_venc_pontos FROM clube_pontos
   WHERE whatsapp = v_whatsapp AND NOT estornado AND saldo > 0 AND expira_em = v_venc;

  RETURN jsonb_build_object(
    'participante', v_membro.primeira_compra_em IS NOT NULL,
    'pontos', v_pontos,
    'valor', round(v_pontos * v_valor_ponto, 2),
    'proximo_vencimento', v_venc,
    'pontos_vencendo', v_venc_pontos,
    'aniversario_pontos', v_aniversario,
    'tem_aniversario', v_membro.nascimento_mes IS NOT NULL,
    'cupons', coalesce((
      SELECT jsonb_agg(jsonb_build_object(
               'codigo', c.codigo, 'valor', c.valor,
               'validade', c.validade, 'valor_minimo', c.valor_minimo)
             ORDER BY c.validade)
      FROM cupons c
      WHERE c.whatsapp = v_whatsapp AND c.origem = 'clube' AND c.ativo
        AND c.usos < coalesce(c.limite_usos, 1)
        AND (c.validade IS NULL OR c.validade >= (NOW() AT TIME ZONE 'America/Sao_Paulo')::DATE)
    ), '[]'::jsonb)
  );
END;
$$;

-- ──────────────────────────────────────────────────────────────────────────
-- 10. Criação do pedido: pontos, cupom, aniversário e indicação
-- ──────────────────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS create_order_with_items(
  TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, NUMERIC, NUMERIC, JSONB, NUMERIC, BOOLEAN
);
DROP FUNCTION IF EXISTS create_order_with_items(
  TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, NUMERIC, NUMERIC, JSONB
);

-- p_usar_cashback mantém o nome antigo: é o que o site já publicado envia.
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
  p_usar_cashback BOOLEAN DEFAULT false,
  p_cupom_codigo TEXT DEFAULT NULL,
  p_indicado_por TEXT DEFAULT NULL,
  p_aniversario TEXT DEFAULT NULL
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
  v_cupom cupons%ROWTYPE;
  v_cupom_codigo TEXT;
  v_indicado TEXT := normalizar_whatsapp(p_indicado_por);
  v_dia SMALLINT;
  v_mes SMALLINT;
  v_elegivel NUMERIC := 0;
  v_valor_ponto NUMERIC := clube_num('clube_valor_ponto', 0.10);
  v_max_reais NUMERIC;
  v_pontos INTEGER := 0;
  v_desconto NUMERIC := 0;
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
    -- Cupom: revalidado aqui e marcado como usado. Cupom do clube só vale
    -- com o WhatsApp de quem trocou os pontos.
    IF coalesce(trim(p_cupom_codigo), '') <> '' THEN
      SELECT * INTO v_cupom FROM cupons
       WHERE upper(trim(codigo)) = upper(trim(p_cupom_codigo))
       FOR UPDATE;
      IF NOT FOUND
         OR NOT v_cupom.ativo
         OR (v_cupom.validade IS NOT NULL AND v_cupom.validade < (NOW() AT TIME ZONE 'America/Sao_Paulo')::DATE)
         OR (v_cupom.limite_usos IS NOT NULL AND v_cupom.usos >= v_cupom.limite_usos)
         OR coalesce(p_subtotal, 0) < coalesce(v_cupom.valor_minimo, 0)
         OR (v_cupom.whatsapp IS NOT NULL AND v_cupom.whatsapp <> v_whatsapp) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Cupom inválido ou expirado', 'code', 'CUPOM_INVALIDO');
      END IF;
      UPDATE cupons SET usos = usos + 1 WHERE id = v_cupom.id;
      v_cupom_codigo := v_cupom.codigo;
    END IF;

    -- Aniversário "dd/mm" e indicação ficam guardados até a primeira compra.
    IF p_aniversario ~ '^\s*\d{1,2}\s*/\s*\d{1,2}\s*$' THEN
      v_dia := split_part(regexp_replace(p_aniversario, '\s', '', 'g'), '/', 1)::SMALLINT;
      v_mes := split_part(regexp_replace(p_aniversario, '\s', '', 'g'), '/', 2)::SMALLINT;
      IF v_dia NOT BETWEEN 1 AND 31 OR v_mes NOT BETWEEN 1 AND 12 THEN
        v_dia := NULL; v_mes := NULL;
      END IF;
    END IF;
    IF length(v_indicado) < 10 OR v_indicado = v_whatsapp THEN
      v_indicado := NULL;
    END IF;

    IF length(v_whatsapp) >= 10 THEN
      -- Aniversário e indicação não se sobrescrevem: senão daria para trocar
      -- a data todo mês ou reapontar quem indicou.
      INSERT INTO clube_membros (whatsapp, nome, nascimento_dia, nascimento_mes, indicado_por)
      VALUES (v_whatsapp, nullif(trim(p_cliente_nome), ''), v_dia, v_mes, v_indicado)
      ON CONFLICT (whatsapp) DO UPDATE SET
        nome = coalesce(clube_membros.nome, EXCLUDED.nome),
        nascimento_dia = CASE WHEN clube_membros.nascimento_mes IS NULL
                              THEN EXCLUDED.nascimento_dia ELSE clube_membros.nascimento_dia END,
        nascimento_mes = coalesce(clube_membros.nascimento_mes, EXCLUDED.nascimento_mes),
        indicado_por = CASE WHEN clube_membros.primeira_compra_em IS NULL
                            THEN coalesce(clube_membros.indicado_por, EXCLUDED.indicado_por)
                            ELSE clube_membros.indicado_por END;

      PERFORM clube_aplicar_aniversario(v_whatsapp);
    END IF;

    INSERT INTO pedidos (
      numero, cliente_nome, cliente_whatsapp, cliente_email,
      cliente_endereco, forma_pagamento, tipo_entrega,
      observacoes, subtotal, frete, total, cashback_usado, pontos_usados,
      cupom_codigo, indicado_por, status
    ) VALUES (
      p_numero, p_cliente_nome, p_cliente_whatsapp, NULLIF(p_cliente_email, ''),
      p_cliente_endereco, p_forma_pagamento, p_tipo_entrega,
      p_observacoes, p_subtotal, v_frete, v_total, 0, 0,
      v_cupom_codigo, v_indicado, 'pendente'
    )
    RETURNING id INTO v_pedido_id;

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

    -- Pontos no checkout: só com o clube no ar, sem cupom (não soma) e só
    -- sobre produtos fora de promoção. Variação com preço próprio não tem
    -- promoção.
    IF p_usar_cashback AND clube_ativo() AND v_cupom_codigo IS NULL
       AND length(v_whatsapp) >= 10 AND v_valor_ponto > 0 THEN
      SELECT coalesce(sum(i.subtotal), 0) INTO v_elegivel
      FROM pedido_itens i
      LEFT JOIN produtos p ON p.id = i.produto_id
      LEFT JOIN variacoes va ON va.id = i.variacao_id
      WHERE i.pedido_id = v_pedido_id
        AND NOT (
          coalesce(va.preco, 0) <= 0
          AND coalesce(p.preco_promocional, 0) > 0
          AND p.preco_promocional < p.preco
        );

      v_max_reais := least(
        round(v_elegivel * clube_num('clube_checkout_max_percentual', 10) / 100, 2),
        greatest(v_total - v_frete, 0));
      v_pontos := floor(v_max_reais / v_valor_ponto)::INTEGER;
      v_pontos := clube_consumir(v_whatsapp, v_pontos, 'pedido', v_pedido_id, NULL);
      IF v_pontos > 0 THEN
        v_desconto := round(v_pontos * v_valor_ponto, 2);
        v_total := v_total - v_desconto;
        UPDATE pedidos SET total = v_total, cashback_usado = v_desconto, pontos_usados = v_pontos
         WHERE id = v_pedido_id;
      END IF;
    END IF;

    RETURN jsonb_build_object(
      'success', true,
      'id', v_pedido_id,
      'numero', p_numero,
      'status', 'pendente',
      'total', v_total,
      'cashback_usado', v_desconto,
      'pontos_usados', v_pontos,
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
-- 11. Retaguarda
-- ──────────────────────────────────────────────────────────────────────────
-- Resumo de um cliente: saldo, lotes, usos e cupons.
CREATE OR REPLACE FUNCTION clube_admin_cliente(p_whatsapp TEXT)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_whatsapp TEXT := normalizar_whatsapp(p_whatsapp);
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'acesso negado' USING ERRCODE = '42501';
  END IF;
  RETURN jsonb_build_object(
    'whatsapp', v_whatsapp,
    'membro', (SELECT to_jsonb(m) FROM clube_membros m WHERE m.whatsapp = v_whatsapp),
    'pontos', clube_saldo(v_whatsapp),
    'valor', round(clube_saldo(v_whatsapp) * clube_num('clube_valor_ponto', 0.10), 2),
    'lotes', coalesce((SELECT jsonb_agg(to_jsonb(l) ORDER BY l.criado_em DESC)
                       FROM clube_pontos l WHERE l.whatsapp = v_whatsapp), '[]'::jsonb),
    'usos', coalesce((SELECT jsonb_agg(to_jsonb(u) ORDER BY u.criado_em DESC)
                      FROM clube_pontos_usos u JOIN clube_pontos l ON l.id = u.lote_id
                      WHERE l.whatsapp = v_whatsapp), '[]'::jsonb),
    'cupons', coalesce((SELECT jsonb_agg(to_jsonb(c) ORDER BY c.criado_em DESC)
                        FROM cupons c WHERE c.whatsapp = v_whatsapp), '[]'::jsonb)
  );
END;
$$;

-- Ajuste manual: positivo credita, negativo retira. Para zerar, passe o
-- saldo negativo (a retaguarda faz isso no botão "zerar").
CREATE OR REPLACE FUNCTION clube_admin_ajustar(p_whatsapp TEXT, p_pontos INTEGER, p_motivo TEXT)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_whatsapp TEXT := normalizar_whatsapp(p_whatsapp);
  v_feito INTEGER := 0;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'acesso negado' USING ERRCODE = '42501';
  END IF;
  IF length(v_whatsapp) < 10 OR coalesce(p_pontos, 0) = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Informe WhatsApp e pontos');
  END IF;

  IF p_pontos > 0 THEN
    INSERT INTO clube_membros (whatsapp) VALUES (v_whatsapp) ON CONFLICT DO NOTHING;
    v_feito := clube_creditar(v_whatsapp, 'ajuste', NULL, p_pontos,
                              coalesce(nullif(trim(p_motivo), ''), 'Ajuste da loja'));
  ELSE
    v_feito := -clube_consumir(v_whatsapp, -p_pontos,
                               'ajuste: ' || coalesce(nullif(trim(p_motivo), ''), 'retirado pela loja'));
  END IF;

  RETURN jsonb_build_object('success', true, 'pontos', v_feito, 'saldo', clube_saldo(v_whatsapp));
END;
$$;

-- Números do programa e aniversariantes do mês.
CREATE OR REPLACE FUNCTION clube_admin_painel(p_mes INTEGER DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_mes INTEGER := coalesce(p_mes, extract(month FROM (NOW() AT TIME ZONE 'America/Sao_Paulo'))::INTEGER);
  v_valor_ponto NUMERIC := clube_num('clube_valor_ponto', 0.10);
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'acesso negado' USING ERRCODE = '42501';
  END IF;
  RETURN jsonb_build_object(
    'membros', (SELECT count(*) FROM clube_membros WHERE primeira_compra_em IS NOT NULL),
    'pontos_em_aberto', (SELECT coalesce(sum(saldo), 0) FROM clube_pontos
                         WHERE NOT estornado AND saldo > 0 AND expira_em > NOW()),
    'valor_em_aberto', round((SELECT coalesce(sum(saldo), 0) FROM clube_pontos
                              WHERE NOT estornado AND saldo > 0 AND expira_em > NOW()) * v_valor_ponto, 2),
    'pontos_usados_30d', (SELECT coalesce(sum(u.pontos), 0) FROM clube_pontos_usos u
                          WHERE NOT u.devolvido AND u.criado_em > NOW() - INTERVAL '30 days'),
    'desconto_pedidos_30d', (SELECT coalesce(sum(cashback_usado), 0) FROM pedidos
                             WHERE cashback_usado > 0 AND criado_em > NOW() - INTERVAL '30 days'
                               AND status NOT IN ('cancelado', 'recusado', 'reembolsado')),
    'aniversariantes', coalesce((
      SELECT jsonb_agg(jsonb_build_object(
               'whatsapp', m.whatsapp, 'nome', m.nome, 'dia', m.nascimento_dia,
               'pontos', clube_saldo(m.whatsapp),
               'bonus_dado', m.aniversario_bonus_ano = extract(year FROM NOW())::INTEGER)
             ORDER BY m.nascimento_dia)
      FROM clube_membros m
      WHERE m.nascimento_mes = v_mes AND m.primeira_compra_em IS NOT NULL
    ), '[]'::jsonb)
  );
END;
$$;

-- ──────────────────────────────────────────────────────────────────────────
-- 12. Permissões
-- ──────────────────────────────────────────────────────────────────────────
-- O Supabase dá EXECUTE a anon/authenticated em toda função nova; as internas
-- ficam só para o banco. As de admin checam is_admin() por dentro.
REVOKE EXECUTE ON FUNCTION clube_num(TEXT, NUMERIC) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION clube_ativo() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION clube_cupom_valores() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION clube_fim_do_dia(INTEGER) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION clube_saldo(TEXT) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION clube_creditar(TEXT, TEXT, BIGINT, INTEGER, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION clube_consumir(TEXT, INTEGER, TEXT, BIGINT, BIGINT) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION clube_aplicar_aniversario(TEXT) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION clube_ao_mudar_status() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION clube_admin_cliente(TEXT) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION clube_admin_ajustar(TEXT, INTEGER, TEXT) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION clube_admin_painel(INTEGER) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION normalizar_whatsapp(TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION clube_regras() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION consultar_clube(TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION clube_resgatar_cupom(TEXT, NUMERIC) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION validar_cupom(TEXT, NUMERIC, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION create_order_with_items(
  TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, NUMERIC, NUMERIC, JSONB, NUMERIC, BOOLEAN, TEXT, TEXT, TEXT
) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION clube_admin_cliente(TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION clube_admin_ajustar(TEXT, INTEGER, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION clube_admin_painel(INTEGER) TO authenticated, service_role;
