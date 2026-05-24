-- Migration: Criar tabela de configurações para subcategorias ocultas

CREATE TABLE IF NOT EXISTS configuracoes (
  chave VARCHAR(64) PRIMARY KEY,
  valor JSONB NOT NULL,
  descricao TEXT,
  atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

-- Inserir configuração de subcategorias ocultas
INSERT INTO configuracoes (chave, valor, descricao)
VALUES (
  'subcategorias_ocultas',
  '["especial"]'::jsonb,
  'Lista de subcategorias que não aparecem no filtro do site'
)
ON CONFLICT (chave) DO UPDATE SET
  valor = EXCLUDED.valor;

-- Permitir leitura pública
ALTER TABLE configuracoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "configuracoes_select_public"
  ON configuracoes FOR SELECT
  TO anon, authenticated
  USING (true);
