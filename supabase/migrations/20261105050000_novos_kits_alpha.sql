-- Mais 6 kits do dia a dia (3 unidades cada) e preço único no card.
--
-- Regra de preço: preco_pix é o preço do kit (o card mostra só ele) e fica no
-- piso à vista dos itens, como no Acrema Kit Alpha (seda Alpha R$ 10, piteira
-- Alpha R$ 10, BIC R$ 15, Acrema R$ 30, demais pelo Pix do site), em ,90.
-- preco (cartão) = Pix + ~5% da taxa do cartão, arredondado para ,90.
-- O checkout já cobra o Pix ou o cartão conforme a escolha do cliente.
--
--   ALPHA KIT ALPHA ............ Pix 19,90 / cartão 20,90
--   ALPHA DUO KIT ALPHA ........ Pix 29,90 / cartão 31,90
--   PAY-PAY KIT ALPHA .......... Pix 35,00 / cartão 36,90 (cartão sobe)
--   RAW KIT ALPHA .............. Pix 36,90 / cartão 38,90
--   YERBINHA KIT ALPHA ......... Pix 64,90 / cartão 68,90
--   ACREMA PAPELITO KIT ALPHA .. Pix 77,90 / cartão 81,90
--   ALEDA KIT ALPHA ............ Pix 99,90 / cartão 104,90
--   ACREMA KIT ALPHA ........... Pix 114,90 / cartão 119,90 (sem mudança)

INSERT INTO produtos
  (nome, marca, descricao, categoria_id, subcategoria, preco, preco_promocional, preco_pix,
   imagem_url, estoque, ativo, destaque, destaque_ordem)
SELECT 'ALPHA KIT ALPHA', 'ALPHA', E'Um kit pensado, desenvolvido e exclusivo para quem realmente entende.\n\nEste kit contém:\n• 1 seda Alpha Hemp Brasil Slim Brown\n• 1 piteira Alpha\n\nO básico que não pode faltar, num kit exclusivo Alpha Galerie. Pronto para sair com você a qualquer momento.',
       (SELECT id FROM categorias WHERE nome = 'Headshop'),
       'Kits Exclusivos', 20.90, NULL, 19.90,
       'https://www.alphagalerie.com/kits/kit-alpha.jpg', 3, true, false, 0
WHERE NOT EXISTS (SELECT 1 FROM produtos WHERE nome = 'ALPHA KIT ALPHA');

INSERT INTO produtos
  (nome, marca, descricao, categoria_id, subcategoria, preco, preco_promocional, preco_pix,
   imagem_url, estoque, ativo, destaque, destaque_ordem)
SELECT 'ALPHA DUO KIT ALPHA', 'ALPHA', E'Um kit pensado, desenvolvido e exclusivo para quem realmente entende.\n\nEste kit contém:\n• 2 sedas Alpha Hemp Brasil Slim Brown\n• 1 piteira Alpha\n\nSeda em dobro para o rolê render, num kit exclusivo Alpha Galerie. Pronto para sair com você a qualquer momento.',
       (SELECT id FROM categorias WHERE nome = 'Headshop'),
       'Kits Exclusivos', 31.90, NULL, 29.90,
       'https://www.alphagalerie.com/kits/kit-alpha-duo.jpg', 3, true, false, 1
WHERE NOT EXISTS (SELECT 1 FROM produtos WHERE nome = 'ALPHA DUO KIT ALPHA');

INSERT INTO produtos
  (nome, marca, descricao, categoria_id, subcategoria, preco, preco_promocional, preco_pix,
   imagem_url, estoque, ativo, destaque, destaque_ordem)
SELECT 'RAW KIT ALPHA', 'ALPHA', E'Um kit pensado, desenvolvido e exclusivo para quem realmente entende.\n\nEste kit contém:\n• 1 seda RAW Classic\n• 1 seda Alpha Hemp Brasil Slim Brown\n• 1 piteira Nowdays\n\nDuas sedas de referência e uma piteira premium, num kit exclusivo Alpha Galerie. Pronto para sair com você a qualquer momento.',
       (SELECT id FROM categorias WHERE nome = 'Headshop'),
       'Kits Exclusivos', 38.90, NULL, 36.90,
       'https://www.alphagalerie.com/kits/kit-raw.jpg', 3, true, false, 3
WHERE NOT EXISTS (SELECT 1 FROM produtos WHERE nome = 'RAW KIT ALPHA');

INSERT INTO produtos
  (nome, marca, descricao, categoria_id, subcategoria, preco, preco_promocional, preco_pix,
   imagem_url, estoque, ativo, destaque, destaque_ordem)
SELECT 'YERBINHA KIT ALPHA', 'ALPHA', E'Um kit pensado, desenvolvido e exclusivo para quem realmente entende.\n\nEste kit contém:\n• 1 tabaco Yerbinha 15g\n• 1 seda RAW Classic\n• 1 seda Alpha Hemp Brasil Slim Brown\n• 1 isqueiro BIC grande\n• 1 piteira Alpha\n\nO kit com tabaco: tudo o que não pode faltar, com produtos selecionados, num kit exclusivo Alpha Galerie. Pronto para sair com você a qualquer momento.',
       (SELECT id FROM categorias WHERE nome = 'Headshop'),
       'Kits Exclusivos', 68.90, NULL, 64.90,
       'https://www.alphagalerie.com/kits/kit-yerbinha.jpg', 3, true, false, 4
WHERE NOT EXISTS (SELECT 1 FROM produtos WHERE nome = 'YERBINHA KIT ALPHA');

INSERT INTO produtos
  (nome, marca, descricao, categoria_id, subcategoria, preco, preco_promocional, preco_pix,
   imagem_url, estoque, ativo, destaque, destaque_ordem)
SELECT 'ACREMA PAPELITO KIT ALPHA', 'ALPHA', E'Um kit pensado, desenvolvido e exclusivo para quem realmente entende.\n\nEste kit contém:\n• 1 tabaco Acrema Blend 20g\n• 1 seda Alpha Hemp Brasil Slim Brown\n• 1 piteira Papelito Biodegradável Mega Longa\n• 1 piteira Alpha\n• 1 isqueiro BIC grande\n\nO kit com tabaco: tudo o que não pode faltar, com produtos selecionados, num kit exclusivo Alpha Galerie. Pronto para sair com você a qualquer momento.',
       (SELECT id FROM categorias WHERE nome = 'Headshop'),
       'Kits Exclusivos', 81.90, NULL, 77.90,
       'https://www.alphagalerie.com/kits/kit-acrema-papelito.jpg', 3, true, false, 5
WHERE NOT EXISTS (SELECT 1 FROM produtos WHERE nome = 'ACREMA PAPELITO KIT ALPHA');

INSERT INTO produtos
  (nome, marca, descricao, categoria_id, subcategoria, preco, preco_promocional, preco_pix,
   imagem_url, estoque, ativo, destaque, destaque_ordem)
SELECT 'ALEDA KIT ALPHA', 'ALPHA', E'Um kit pensado, desenvolvido e exclusivo para quem realmente entende.\n\nEste kit contém:\n• 1 seda aLeda Brown Ouro King Size Slim\n• 1 seda Alpha Hemp Brasil Slim Brown\n• 1 tesoura dobrável prata\n• 1 piteira Papelito Biodegradável Mega Longa\n• 1 piteira Alpha\n• 1 isqueiro BIC grande\n\nO kit completo, com tesoura: tudo o que não pode faltar, com produtos selecionados, num kit exclusivo Alpha Galerie. Pronto para sair com você a qualquer momento.',
       (SELECT id FROM categorias WHERE nome = 'Headshop'),
       'Kits Exclusivos', 104.90, NULL, 99.90,
       'https://www.alphagalerie.com/kits/kit-aleda.jpg', 3, true, false, 6
WHERE NOT EXISTS (SELECT 1 FROM produtos WHERE nome = 'ALEDA KIT ALPHA');

UPDATE produtos SET preco = 36.90, preco_pix = 35.00, destaque_ordem = 2 WHERE nome = 'PAY-PAY KIT ALPHA';
UPDATE produtos SET destaque_ordem = 7 WHERE nome = 'ACREMA KIT ALPHA';
UPDATE produtos SET destaque_ordem = destaque_ordem + 20
 WHERE subcategoria = 'Kits Exclusivos' AND nome LIKE 'KIT CASE ALPHA%' AND destaque_ordem < 20;
