-- Migration: Adicionar coluna 'oculto' na tabela categorias
-- Permite ocultar categorias do menu de navegação sem desativá-las

-- 1. Adicionar coluna oculto (default false, categorias existentes ficam visíveis)
ALTER TABLE categorias ADD COLUMN IF NOT EXISTS oculto BOOLEAN DEFAULT false;

-- 2. Marcar a categoria "especial" como oculta
UPDATE categorias SET oculto = true WHERE LOWER(nome) = 'especial';

-- 3. Atualizar o índice para incluir a nova coluna
DROP INDEX IF EXISTS idx_categorias_ativo_ordem;
CREATE INDEX idx_categorias_ativo_oculto_ordem ON categorias(ativo, oculto, ordem);
