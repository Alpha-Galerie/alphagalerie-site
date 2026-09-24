-- Base do cashback limitada ao subtotal dos produtos.
--
-- Pedidos criados antes da migração do cashback têm frete = 0 e o total com o
-- frete dentro (ex.: subtotal 20, total 49). Sem teto, ao serem marcados como
-- pagos gerariam cashback sobre o frete. Pedidos novos não mudam: para eles
-- total − frete já é menor ou igual ao subtotal.

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

  -- Cashback nunca pode travar a retaguarda: se algo abaixo falhar, a mudança
  -- de status passa mesmo assim e o erro fica no log do banco.
  BEGIN

  -- Pagou: gera (ou reativa) o crédito deste pedido.
  IF v_e_pago AND NOT v_era_pago THEN
    v_whatsapp := normalizar_whatsapp(NEW.cliente_whatsapp);
    v_base := greatest(coalesce(NEW.total, 0) - coalesce(NEW.frete, 0), 0);
    -- Pedidos de antes do cashback não gravavam o frete (fica 0 e o total o
    -- inclui). O subtotal dos produtos é o teto: frete nunca vira crédito.
    IF coalesce(NEW.subtotal, 0) > 0 THEN
      v_base := least(v_base, NEW.subtotal);
    END IF;
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

  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'cashback: pedido % (% → %) não processado: % [%]',
      NEW.id, OLD.status, NEW.status, SQLERRM, SQLSTATE;
  END;

  RETURN NEW;
END;
$$;
