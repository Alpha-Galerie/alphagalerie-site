-- Busca da vitrine sem acento
--
-- A busca fazia `ilike '%termo%'` em nome, marca e subcategoria, com o texto
-- exatamente como o cliente digitou. "carvão" não casava com a subcategoria
-- "Carvao" nem com "KANARA 1KG": só apareciam o batedor e o pegador, que
-- têm "CARVÃO" com til no nome. O mesmo valia para essência/Essencias,
-- acessório/Acessorios, balança/BALANCA.
--
-- `produtos.busca_texto` guarda nome, marca, subcategoria e categoria já em
-- minúsculas e sem acento; o site normaliza o termo do mesmo jeito e procura
-- cada palavra nessa coluna. Um trigger mantém a coluna em dia a cada
-- cadastro ou edição feitos pela retaguarda.

CREATE OR REPLACE FUNCTION normalizar_busca(p TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
SET search_path = public, pg_catalog
AS $$
  SELECT regexp_replace(btrim(translate(lower(coalesce(p, '')),
    'áàâãäåéèêëíìîïóòôõöúùûüçñý', 'aaaaaaeeeeiiiiooooouuuucny')), '\s+', ' ', 'g');
$$;

ALTER TABLE produtos ADD COLUMN IF NOT EXISTS busca_texto TEXT;

CREATE OR REPLACE FUNCTION produtos_preencher_busca_texto()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_catalog
AS $$
BEGIN
  NEW.busca_texto := normalizar_busca(concat_ws(' ',
    NEW.nome, NEW.marca, NEW.subcategoria,
    (SELECT c.nome FROM categorias c WHERE c.id = NEW.categoria_id)));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_produtos_busca_texto ON produtos;
CREATE TRIGGER trg_produtos_busca_texto
  BEFORE INSERT OR UPDATE OF nome, marca, subcategoria, categoria_id ON produtos
  FOR EACH ROW
  EXECUTE FUNCTION produtos_preencher_busca_texto();

-- Preenche os produtos que já existem sem mexer em `atualizado_em` nem
-- disparar os outros triggers de produtos.
SET session_replication_role = replica;
UPDATE produtos p
   SET busca_texto = normalizar_busca(concat_ws(' ',
         p.nome, p.marca, p.subcategoria,
         (SELECT c.nome FROM categorias c WHERE c.id = p.categoria_id)));
SET session_replication_role = origin;
