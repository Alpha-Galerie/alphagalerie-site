-- Migration: preço promocional + vitrine de destaques
--
-- Objetivo: permitir marcar um produto como promoção ("de/por") e usar a flag
-- `destaque` (já existente) como vitrine de evidência na home do site.
--
-- Regras:
--   * preco            = preço cheio (o "de" quando há promoção)
--   * preco_promocional = preço promocional (o "por"). NULL = sem promoção.
--   * preco_pix        = preço à vista no Pix (continua sendo o menor preço)
--   * destaque         = aparece na seção "Destaques" da home

-- 1. Coluna de preço promocional
ALTER TABLE produtos
  ADD COLUMN IF NOT EXISTS preco_promocional NUMERIC(10, 2);

-- 2. Não aceitar valores negativos
ALTER TABLE produtos
  DROP CONSTRAINT IF EXISTS produtos_preco_promocional_check;
ALTER TABLE produtos
  ADD CONSTRAINT produtos_preco_promocional_check
  CHECK (preco_promocional IS NULL OR preco_promocional >= 0);

-- 3. Ordem manual da vitrine de destaques (menor primeiro)
ALTER TABLE produtos
  ADD COLUMN IF NOT EXISTS destaque_ordem INTEGER DEFAULT 0;

-- 4. Índice parcial para a consulta da vitrine de destaques
CREATE INDEX IF NOT EXISTS idx_produtos_destaque_vitrine
  ON produtos (destaque_ordem, id DESC)
  WHERE ativo = true AND destaque = true;
