-- Alpha Club: item em promoção pontua com uma taxa simbólica, só para puxar a
-- recompra. O resto do pedido segue `clube_pontos_por_real`.

INSERT INTO configuracoes (chave, valor, descricao) VALUES
  ('clube_pontos_por_real_promocao', '0.2',
   'Alpha Club: pontos por R$ 1 pago em produtos em promoção (preço promocional abaixo do preço)')
ON CONFLICT (chave) DO NOTHING;

-- Quanto do pedido foi em produto em promoção, pelo preço atual do produto.
CREATE OR REPLACE FUNCTION clube_valor_em_promocao(p_pedido_id BIGINT)
RETURNS NUMERIC
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog'
AS $$
  SELECT coalesce(sum(i.subtotal), 0)
  FROM pedido_itens i
  JOIN produtos p ON p.id = i.produto_id
  WHERE i.pedido_id = p_pedido_id
    AND p.preco_promocional IS NOT NULL
    AND p.preco_promocional > 0
    AND p.preco_promocional < p.preco;
$$;

DROP FUNCTION IF EXISTS clube_regras();
CREATE FUNCTION clube_regras()
RETURNS TABLE(ativo boolean, nome text, pontos_por_real numeric, valor_ponto numeric, validade_dias integer,
              checkout_max_percentual numeric, cupom_valores numeric[], cupom_validade_dias integer,
              cupom_minimo_multiplicador numeric, bonus_boas_vindas integer, bonus_aniversario integer,
              bonus_indicacao integer, pontos_por_real_promocao numeric)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog'
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
    clube_num('clube_bonus_indicacao', 100)::INTEGER,
    clube_num('clube_pontos_por_real_promocao', 0.2);
$$;
GRANT EXECUTE ON FUNCTION clube_regras() TO anon, authenticated, service_role;

-- Pontos da compra: a parte em promoção pontua com a taxa de promoção.
DO $do$
DECLARE
  d TEXT := pg_get_functiondef('public.clube_ao_mudar_status'::regproc);
BEGIN
  IF position('clube_pontos_por_real_promocao' IN d) = 0 THEN
    d := replace(d,
      $a$floor(v_base * clube_num('clube_pontos_por_real', 1))::INTEGER);$a$,
      $b$floor((v_base - least(clube_valor_em_promocao(NEW.id), v_base)) * clube_num('clube_pontos_por_real', 1)
          + least(clube_valor_em_promocao(NEW.id), v_base) * clube_num('clube_pontos_por_real_promocao', 0.2))::INTEGER);$b$);
    IF position('clube_pontos_por_real_promocao' IN d) = 0 THEN
      RAISE EXCEPTION 'clube_ao_mudar_status: trecho dos pontos da compra não encontrado';
    END IF;
    EXECUTE d;
  END IF;
END
$do$;
