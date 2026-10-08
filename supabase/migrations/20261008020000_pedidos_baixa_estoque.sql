-- Baixa de estoque automática nos pedidos do site
--
-- Até aqui nenhum pedido mexia em `produtos.estoque`: o cliente comprava e o
-- site continuava mostrando a mesma quantidade.
--
-- Regra (mesmos grupos de status do Alpha Club, via status_base):
--   * entrou em pago / enviado / entregue → baixa a quantidade de cada item
--     (produto ou variação), sem deixar negativo;
--   * foi cancelado / recusado / reembolsado depois de baixar → devolve;
--   * reativou um cancelado para pago → baixa de novo.
-- `pedidos.estoque_baixado` garante que cada pedido baixa uma vez só, mesmo
-- passando por pago → enviado → entregue.
--
-- Roda em BEFORE UPDATE para marcar a flag na mesma linha, sem um segundo
-- UPDATE. Assim como o clube, nunca trava a mudança de status: se algo falhar,
-- o status muda e o erro fica no log do banco.

ALTER TABLE pedidos
  ADD COLUMN IF NOT EXISTS estoque_baixado BOOLEAN NOT NULL DEFAULT false;

-- Pedidos que já estão pagos/enviados/entregues contam como baixados: o
-- estoque deles foi acertado na contagem física. Se um deles for cancelado,
-- a peça volta para o estoque.
-- Os triggers ficam desligados nesta marcação para não mexer em
-- `atualizado_em` nem disparar o clube.
SET session_replication_role = replica;
UPDATE pedidos
   SET estoque_baixado = true
 WHERE status IN (SELECT slug FROM pedido_status
                   WHERE conta_como IN ('pago', 'enviado', 'entregue'))
   AND NOT estoque_baixado;
SET session_replication_role = origin;

CREATE OR REPLACE FUNCTION pedidos_movimentar_estoque()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  c_pagos      CONSTANT TEXT[] := ARRAY['pago', 'enviado', 'entregue'];
  c_cancelados CONSTANT TEXT[] := ARRAY['cancelado', 'recusado', 'reembolsado'];
  v_e_pago      BOOLEAN := coalesce(status_base(NEW.status) = ANY (c_pagos), false);
  v_e_cancelado BOOLEAN := coalesce(status_base(NEW.status) = ANY (c_cancelados), false);
  v_sinal INTEGER;
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;

  IF v_e_pago AND NOT NEW.estoque_baixado THEN
    v_sinal := -1;
  ELSIF v_e_cancelado AND NEW.estoque_baixado THEN
    v_sinal := 1;
  ELSE
    RETURN NEW;
  END IF;

  BEGIN
    -- Itens com variação: mexe no estoque da variação.
    UPDATE variacoes v
       SET estoque = greatest(v.estoque + v_sinal * i.qtd, 0)
      FROM (
        SELECT variacao_id, sum(quantidade)::INTEGER AS qtd
          FROM pedido_itens
         WHERE pedido_id = NEW.id AND variacao_id IS NOT NULL
         GROUP BY variacao_id
      ) i
     WHERE v.id = i.variacao_id;

    -- Itens sem variação: mexe no estoque do produto (NULL = sem controle).
    UPDATE produtos p
       SET estoque = greatest(p.estoque + v_sinal * i.qtd, 0)
      FROM (
        SELECT produto_id, sum(quantidade)::INTEGER AS qtd
          FROM pedido_itens
         WHERE pedido_id = NEW.id AND variacao_id IS NULL AND produto_id IS NOT NULL
         GROUP BY produto_id
      ) i
     WHERE p.id = i.produto_id
       AND p.estoque IS NOT NULL;

    NEW.estoque_baixado := (v_sinal = -1);
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'estoque: pedido % (% para %) nao movimentado: % [%]',
      NEW.id, OLD.status, NEW.status, SQLERRM, SQLSTATE;
  END;

  RETURN NEW;
END;
$fn$;

CREATE OR REPLACE TRIGGER trg_pedidos_estoque
  BEFORE UPDATE OF status ON pedidos
  FOR EACH ROW
  EXECUTE FUNCTION pedidos_movimentar_estoque();
