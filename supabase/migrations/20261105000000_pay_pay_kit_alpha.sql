-- Kits do dia a dia: seda + piteira no estojo exclusivo Alpha Galerie
-- (embalagem feita na gráfica, só existe dentro do kit).
--
-- * Entra o primeiro, PAY-PAY KIT ALPHA, DESLIGADO (ativo = false) até fechar
--   o preço: falta o custo do estojo da gráfica.
--   Itens avulsos no site: 2x Pay-Pay Go Green Slim (R$ 13) + piteira Papelito
--   Biodegradável Mega Longa (R$ 14) = R$ 40,00, sem o estojo.
--   Para ligar, depois de definir o preço:
--     update produtos set preco = <cheio>, preco_promocional = <kit>,
--       preco_pix = <kit>, ativo = true where nome = 'PAY-PAY KIT ALPHA';
-- * Saem do ar os 5 kits sem case (ativo = false, dá pra religar).
-- * destaque_ordem 0: o kit aparece primeiro na home e em /kit.

INSERT INTO produtos
  (nome, marca, descricao, categoria_id, subcategoria, preco, preco_promocional, preco_pix,
   imagem_url, estoque, ativo, destaque, destaque_ordem)
SELECT 'PAY-PAY KIT ALPHA', 'ALPHA',
       'Um kit pensado, desenvolvido e exclusivo para quem realmente entende. Vem no kit: 2 sedas Pay-Pay Go Green Slim (alfafa) + piteira Papelito Biodegradável Mega Longa, juntas no estojo exclusivo Alpha Galerie. Seda, piteira e estojo pensados como um conjunto: tudo num lugar só, sem seda amassada nem piteira perdida no bolso. Esqueceu o case em casa? Este vai com você. Exclusivo Alpha Galerie: você não encontra em outra loja.',
       (SELECT id FROM categorias WHERE nome = 'Headshop'),
       'Kits Exclusivos', 40.00, NULL, 40.00,
       'https://www.alphagalerie.com/kits/kit-pay-pay-alpha.jpg', 10, false, false, 0
WHERE NOT EXISTS (SELECT 1 FROM produtos WHERE nome = 'PAY-PAY KIT ALPHA');

UPDATE produtos
   SET ativo = false
 WHERE subcategoria = 'Kits Exclusivos'
   AND nome IN ('KIT ESSENCIAL ALPHA', 'KIT PRONTO PRA USAR', 'KIT DUO DE SEDAS',
                'KIT ACREMA', 'KIT ACREMA + TRITURADOR');
