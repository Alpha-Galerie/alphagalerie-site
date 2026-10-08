-- Migration: etiqueta livre no card + liquidação de essências
--
-- `etiqueta` é um selo de texto exibido no card do produto (ex.: "Últimas
-- peças"). NULL = sem selo. Quando o estoque zera, o card já troca para
-- "Esgotado" e bloqueia a compra.

ALTER TABLE produtos
  ADD COLUMN IF NOT EXISTS etiqueta TEXT;

-- Liquidação: R$ 15 no Pix e no cartão, com selo "Últimas peças".
--   42  DEBAJ
--   424 FUSION
--   466 SMYRNA
--   496 TRESD LOOPS
UPDATE produtos
   SET preco_promocional = 15.00,
       preco_pix         = 15.00,
       etiqueta          = 'Últimas peças'
 WHERE id IN (42, 424, 466, 496);
