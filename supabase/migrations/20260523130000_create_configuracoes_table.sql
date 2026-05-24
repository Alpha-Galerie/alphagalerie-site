-- Migration: Criar tabela de configurações para subcategorias ocultas

-- Criar tabela se não existir
CREATE TABLE IF NOT EXISTS configuracoes (
  chave VARCHAR(64) PRIMARY KEY,
  valor JSONB NOT NULL,
  descricao TEXT,
  atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

-- Adicionar colunas que possam estar faltando
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'configuracoes' AND column_name = 'descricao'
  ) THEN
    ALTER TABLE configuracoes ADD COLUMN descricao TEXT;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'configuracoes' AND column_name = 'atualizado_em'
  ) THEN
    ALTER TABLE configuracoes ADD COLUMN atualizado_em TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;

-- Inserir ou atualizar configuração de subcategorias ocultas
INSERT INTO configuracoes (chave, valor, descricao)
VALUES (
  'subcategorias_ocultas',
  '["especial"]'::jsonb,
  'Lista de subcategorias que não aparecem no filtro do site'
)
ON CONFLICT (chave) DO UPDATE SET
  valor = EXCLUDED.valor;

-- Permitir leitura pública (anon)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Permitir leitura pública de configurações'
  ) THEN
    ALTER TABLE configuracoes ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "Permitir leitura pública de configurações"
      ON configuracoes FOR SELECT
      TO anon, authenticated
      USING (true);
  END IF;
END $$;
