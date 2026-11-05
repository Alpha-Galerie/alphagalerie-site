-- Kits do dia a dia: seda + piteira no Alpha Pocket, a embalagem exclusiva
-- feita na gráfica (só existe dentro do kit).
--
-- * Entra o primeiro, PAY-PAY KIT ALPHA, a R$ 35,00 (definido pela loja).
--   Itens avulsos no site: 2x Pay-Pay Go Green Slim (R$ 13) + piteira Papelito
--   Biodegradável Mega Longa (R$ 14) = R$ 40,00.
--   Alpha Pocket (gráfica): R$ 338 + R$ 20 de frete / 100 un. = R$ 3,58 por kit.
--   O Alpha Pocket não é vendido avulso, então o card não mostra preço riscado
--   (preço de referência inventado não vale): ele vai incluso.
-- * Saem do ar os 5 kits sem case (ativo = false, dá pra religar).
-- * destaque_ordem 0: o kit aparece primeiro na home e em /kit.

INSERT INTO produtos
  (nome, marca, descricao, categoria_id, subcategoria, preco, preco_promocional, preco_pix,
   imagem_url, estoque, ativo, destaque, destaque_ordem)
SELECT 'PAY-PAY KIT ALPHA', 'ALPHA',
       E'Um kit pensado, desenvolvido e exclusivo para quem realmente entende.\n\nEste kit contém:\n• 2 sedas Pay-Pay Go Green Slim\n• 1 piteira Papelito Biodegradável Mega Longa\n\nTudo no Alpha Pocket, exclusivo Alpha Galerie.\n\nDesenvolvido como inovação no mercado, para atender uma carência real da cena: um kit com o básico que não pode faltar. Produtos de qualidade, protegidos e prontos para sair com você a qualquer momento.',
       (SELECT id FROM categorias WHERE nome = 'Headshop'),
       'Kits Exclusivos', 35.00, NULL, 35.00,
       'https://www.alphagalerie.com/kits/kit-pay-pay-alpha-v2.jpg', 10, true, false, 0
WHERE NOT EXISTS (SELECT 1 FROM produtos WHERE nome = 'PAY-PAY KIT ALPHA');

UPDATE produtos
   SET ativo = false
 WHERE subcategoria = 'Kits Exclusivos'
   AND nome IN ('KIT ESSENCIAL ALPHA', 'KIT PRONTO PRA USAR', 'KIT DUO DE SEDAS',
                'KIT ACREMA', 'KIT ACREMA + TRITURADOR');
