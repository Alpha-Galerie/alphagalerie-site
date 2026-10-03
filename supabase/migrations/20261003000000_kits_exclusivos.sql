-- Migration: Kits exclusivos
--
-- Kits montados na loja para girar estoque (Case Alpha 2.0, Yerbinha 15g,
-- Acrema) e dar percepção de valor: o preço cheio é a soma dos itens avulsos
-- (sai riscado no card) e o preço promocional é o do kit.
--
-- Regra de preço usada:
--   * Case Alpha 2.0 entra a R$ 85 (piso definido pela loja).
--   * Os outros itens entram pelo preço Pix/promocional do site, com o total
--     arredondado para baixo em ,90.
--   * A tesoura dobrável prata é brinde (veio do fornecedor sem custo) e não
--     entra na conta. A tesoura dourada entra pelo preço normal.
--
-- Os kits entram DESLIGADOS (ativo = false): as fotos ficam em /public/kits e
-- só existem no site depois do deploy. Depois do deploy:
--   update produtos set ativo = true where subcategoria = 'Kits Exclusivos';
--
-- Vender um kit não baixa o estoque dos itens avulsos. O estoque de cada kit
-- é o número de kits montados — ajuste na retaguarda.

INSERT INTO produtos
  (nome, marca, descricao, categoria_id, subcategoria, preco, preco_promocional, preco_pix,
   imagem_url, estoque, ativo, destaque, destaque_ordem)
SELECT v.nome, 'ALPHA', v.descricao,
       (SELECT id FROM categorias WHERE nome = 'Headshop'),
       'Kits Exclusivos', v.preco, v.kit, v.kit,
       'https://www.alphagalerie.com/kits/' || v.foto, 3, false, false, v.ordem
FROM (VALUES
  (1, 'KIT ESSENCIAL ALPHA', 'kit-essencial.jpg', 26.00, 18.90,
   'Vem no kit: seda Alpha Hemp Slim Brown + piteira Alpha. Separado sai R$ 26,00.'),
  (2, 'KIT PRONTO PRA USAR', 'kit-pronto-pra-usar.jpg', 42.00, 32.90,
   'Vem no kit: seda Alpha Hemp Slim Brown + piteira Alpha + isqueiro BIC grande. Separado sai R$ 42,00.'),
  (3, 'KIT DUO DE SEDAS', 'kit-duo-de-sedas.jpg', 55.00, 43.90,
   'Vem no kit: seda Alpha Hemp Slim Brown + seda Squadafum King Size Slim + piteira Alpha + isqueiro BIC grande. Separado sai R$ 55,00.'),
  (4, 'KIT ACREMA', 'kit-acrema.jpg', 61.00, 49.90,
   'Vem no kit: tabaco Acrema Blend 20g + seda Alpha Hemp Slim Brown + piteira Alpha + tesoura dobrável prata de brinde. Separado sai R$ 61,00.'),
  (5, 'KIT ACREMA + TRITURADOR', 'kit-acrema-triturador.jpg', 106.00, 87.90,
   'Vem no kit: tabaco Acrema Blend 20g + triturador Squadafum Poli Grinder + seda Alpha Hemp Slim Brown + piteira Alpha + tesoura dobrável prata de brinde. Separado sai R$ 106,00.'),
  (6, 'KIT CASE ALPHA YERBINHA', 'kit-case-yerbinha.jpg', 192.00, 146.90,
   'Vem no kit: Case Alpha 2.0 + tabaco Yerbinha 15g + isqueiro BIC grande + seda Alpha Hemp Slim Brown + seda Squadafum King Size Slim + piteira Alpha + tesoura dobrável prata de brinde. Separado sai R$ 192,00.'),
  (7, 'KIT CASE ALPHA ACREMA', 'kit-case-acrema.jpg', 219.00, 171.90,
   'Vem no kit: Case Alpha 2.0 + tabaco Acrema Blend 20g + container de silicone Squadafum + seda Alpha Hemp Slim Brown + seda Squadafum King Size Slim + piteira Alpha + tesoura dobrável prata de brinde. Separado sai R$ 219,00.'),
  (8, 'KIT CASE ALPHA DORA GRAPE', 'kit-case-dora-grape.jpg', 255.63, 206.90,
   'Vem no kit: Case Alpha 2.0 + tabaco D''ora Grape 20g + isqueiro BIC grande + tesoura dobrável dourada + seda Alpha Hemp Slim Brown + seda Squadafum King Size Slim + piteira Alpha. Separado sai R$ 255,63.'),
  (9, 'KIT CASE ALPHA COMPLETO', 'kit-case-completo.jpg', 305.00, 253.90,
   'Vem no kit: Case Alpha 2.0 + tabaco Yerbinha 15g + isqueiro BIC grande + tesoura dobrável dourada + bowl de silicone Squadafum + triturador Squadafum Poli Grinder + seda Squadafum King Size Slim + piteira Squadafum Large. Separado sai R$ 305,00.')
) AS v(ordem, nome, foto, preco, kit, descricao)
WHERE NOT EXISTS (SELECT 1 FROM produtos p WHERE p.nome = v.nome);
