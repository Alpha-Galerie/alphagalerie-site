-- HASH KIT ALPHA (novo) e ALEDA KIT ALPHA com o tabaco D'ora Grape.
--
-- Simulação de compra no site (Pix), item a item, e preço do kit. O kit fica
-- no piso à vista da loja (Acrema R$ 30, seda Alpha R$ 10, piteira Alpha
-- R$ 10, BIC R$ 15; demais pelo Pix do site), arredondado para baixo em ,90.
-- Cartão = Pix + ~5% da taxa, arredondado para ,90.
--
-- HASH KIT ALPHA
--   tabaco Hash 25g 32,30 + seda Squadafum King Size Slim 12,00 + seda Alpha
--   Hemp 10,00 + piteira Papelito Mega Longa 13,00 + piteira Alpha 10,00 +
--   BIC grande 15,00 + tesoura dobrável prata 40,00 = 132,30
--   kit: Pix 131,90 / cartão 138,90
-- ALEDA KIT ALPHA (+ D'ora Grape 35,00)
--   aLeda 12,00 + seda Alpha Hemp 10,00 + tesoura 40,00 + piteira Papelito
--   13,00 + piteira Alpha 10,00 + BIC 15,00 + D'ora Grape 35,00 = 135,00
--   kit: Pix 134,90 / cartão 141,90

INSERT INTO produtos
  (nome, marca, descricao, categoria_id, subcategoria, preco, preco_promocional, preco_pix,
   imagem_url, estoque, ativo, destaque, destaque_ordem)
SELECT 'HASH KIT ALPHA', 'ALPHA',
       E'Um kit pensado, desenvolvido e exclusivo para quem realmente entende.\n\nEste kit contém:\n• 1 tabaco Hash 25g\n• 1 seda Squadafum King Size Slim\n• 1 seda Alpha Hemp Brasil Slim Brown\n• 1 piteira Papelito Biodegradável Mega Longa\n• 1 piteira Alpha\n• 1 isqueiro BIC grande\n• 1 tesoura dobrável prata\n\nO kit completo, com tabaco e tesoura: tudo o que não pode faltar, com produtos selecionados, num kit único e exclusivo Alpha Galerie. Pronto para sair com você a qualquer momento.',
       (SELECT id FROM categorias WHERE nome = 'Headshop'),
       'Kits Exclusivos', 138.90, NULL, 131.90,
       'https://www.alphagalerie.com/kits/kit-hash.jpg', 3, true, false, 7
WHERE NOT EXISTS (SELECT 1 FROM produtos WHERE nome = 'HASH KIT ALPHA');

UPDATE produtos
   SET preco = 141.90, preco_pix = 134.90, destaque_ordem = 8,
       descricao = E'Um kit pensado, desenvolvido e exclusivo para quem realmente entende.\n\nEste kit contém:\n• 1 tabaco D''ora Grape 20g\n• 1 seda aLeda Brown Ouro King Size Slim\n• 1 seda Alpha Hemp Brasil Slim Brown\n• 1 piteira Papelito Biodegradável Mega Longa\n• 1 piteira Alpha\n• 1 isqueiro BIC grande\n• 1 tesoura dobrável prata\n\nO kit completo, com tabaco e tesoura: tudo o que não pode faltar, com produtos selecionados, num kit único e exclusivo Alpha Galerie. Pronto para sair com você a qualquer momento.'
 WHERE nome = 'ALEDA KIT ALPHA';

UPDATE produtos SET destaque_ordem = 6 WHERE nome = 'ACREMA KIT ALPHA';
