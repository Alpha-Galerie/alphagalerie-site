-- Migration: Add composite index for product listing with stock ordering
-- Covers: ativo=true filter + ORDER BY destaque DESC, estoque DESC NULLS LAST, id ASC

DROP INDEX IF EXISTS idx_produtos_ativo_destaque_id;

CREATE INDEX idx_produtos_listing
ON produtos(ativo, destaque DESC, estoque DESC NULLS LAST, id ASC);
