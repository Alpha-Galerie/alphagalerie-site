-- Conferência dos kits com a mesa da loja (11 kits) e preços redondos.
--
-- Itens corrigidos: RAW leva RAW Classic King Size Slim; Acrema Pay-Pay leva
-- piteira Papelito (não Alpha); o antigo Acrema Papelito vira Acrema
-- Essencial (sem piteira Papelito); Acrema sem piteira Alpha; Hash e Aleda
-- sem piteira Papelito. Novo ALPHA BIC KIT ALPHA (seda Alpha + piteira Alpha
-- + BIC), desligado até ter foto.
--
-- Itens separados no Pix -> kit (Pix / cartão):
--   Alpha 20,00 -> 20 / 21        Alpha Duo 30,00 -> 27 / 29
--   Alpha BIC 35,00 -> 34 / 36    Pay-Pay 37,00 -> 36 / 38
--   RAW 37,25 -> 36 / 38          Yerbinha 65,00 -> 65 / 69
--   Acrema Pay-Pay 69,00 -> 65 / 69   Acrema Essencial 67,00 -> 65 / 69
--   Acrema 109,00 -> 105 / 111    Hash 119,30 -> 115 / 121
--   Aleda 122,00 -> 120 / 126

UPDATE produtos SET preco_pix = 20.00, preco = 21.00
 WHERE nome = 'ALPHA KIT ALPHA' AND subcategoria = 'Kits Exclusivos';

UPDATE produtos SET preco_pix = 27.00, preco = 29.00
 WHERE nome = 'ALPHA DUO KIT ALPHA' AND subcategoria = 'Kits Exclusivos';

UPDATE produtos SET preco_pix = 36.00, preco = 38.00
 WHERE nome = 'PAY-PAY KIT ALPHA' AND subcategoria = 'Kits Exclusivos';

UPDATE produtos SET preco_pix = 36.00, preco = 38.00, descricao = E'Um kit pensado, desenvolvido e exclusivo para quem realmente entende.\n\nEste kit contém:\n• 1 seda RAW Classic King Size Slim\n• 1 seda Alpha Hemp Brasil Slim Brown\n• 1 piteira Nowdays\n\nDuas sedas de referência e uma piteira premium, num kit único e exclusivo Alpha Galerie. Pronto para sair com você a qualquer momento.'
 WHERE nome = 'RAW KIT ALPHA' AND subcategoria = 'Kits Exclusivos';

UPDATE produtos SET preco_pix = 65.00, preco = 69.00, descricao = E'Um kit pensado, desenvolvido e exclusivo para quem realmente entende.\n\nEste kit contém:\n• 1 tabaco Yerbinha 15g\n• 1 seda RAW Classic Single Wide\n• 1 seda Alpha Hemp Brasil Slim Brown\n• 1 piteira Alpha\n• 1 isqueiro BIC grande\n\nO kit com tabaco: tudo o que não pode faltar, com produtos selecionados, num kit único e exclusivo Alpha Galerie. Pronto para sair com você a qualquer momento.'
 WHERE nome = 'YERBINHA KIT ALPHA' AND subcategoria = 'Kits Exclusivos';

UPDATE produtos SET preco_pix = 65.00, preco = 69.00, descricao = E'Um kit pensado, desenvolvido e exclusivo para quem realmente entende.\n\nEste kit contém:\n• 1 tabaco Acrema Blend 20g\n• 2 sedas Pay-Pay Go Green Slim\n• 1 piteira Papelito Biodegradável Mega Longa\n\nO kit com tabaco: tudo o que não pode faltar, com produtos selecionados, num kit único e exclusivo Alpha Galerie. Pronto para sair com você a qualquer momento.'
 WHERE nome = 'ACREMA PAY-PAY KIT ALPHA' AND subcategoria = 'Kits Exclusivos';

UPDATE produtos SET preco_pix = 65.00, preco = 69.00, nome = 'ACREMA ESSENCIAL KIT ALPHA', descricao = E'Um kit pensado, desenvolvido e exclusivo para quem realmente entende.\n\nEste kit contém:\n• 1 tabaco Acrema Blend 20g\n• 1 seda Alpha Hemp Brasil Slim Brown\n• 1 piteira Alpha\n• 1 isqueiro BIC grande\n\nO kit com tabaco: tudo o que não pode faltar, com produtos selecionados, num kit único e exclusivo Alpha Galerie. Pronto para sair com você a qualquer momento.'
 WHERE nome = 'ACREMA PAPELITO KIT ALPHA' AND subcategoria = 'Kits Exclusivos';

UPDATE produtos SET preco_pix = 105.00, preco = 111.00, descricao = E'Um kit pensado, desenvolvido e exclusivo para quem realmente entende.\n\nEste kit contém:\n• 1 tabaco Acrema Blend 20g\n• 1 seda Alpha Hemp Brasil Slim Brown\n• 1 seda Mascotte Slim Brown\n• 1 dichavador Papelito de acrílico\n• 1 isqueiro BIC grande\n\nO kit completo, com tabaco: tudo o que não pode faltar, com produtos selecionados, num kit único e exclusivo Alpha Galerie. Pronto para sair com você a qualquer momento.'
 WHERE nome = 'ACREMA KIT ALPHA' AND subcategoria = 'Kits Exclusivos';

UPDATE produtos SET preco_pix = 115.00, preco = 121.00, descricao = E'Um kit pensado, desenvolvido e exclusivo para quem realmente entende.\n\nEste kit contém:\n• 1 tabaco Hash 25g\n• 1 seda Squadafum King Size Slim\n• 1 seda Alpha Hemp Brasil Slim Brown\n• 1 piteira Alpha\n• 1 isqueiro BIC grande\n• 1 tesoura dobrável prata\n\nO kit completo, com tabaco e tesoura: tudo o que não pode faltar, com produtos selecionados, num kit único e exclusivo Alpha Galerie. Pronto para sair com você a qualquer momento.'
 WHERE nome = 'HASH KIT ALPHA' AND subcategoria = 'Kits Exclusivos';

UPDATE produtos SET preco_pix = 120.00, preco = 126.00, descricao = E'Um kit pensado, desenvolvido e exclusivo para quem realmente entende.\n\nEste kit contém:\n• 1 tabaco D''ora Grape 20g\n• 1 seda aLeda Brown Ouro King Size Slim\n• 1 seda Alpha Hemp Brasil Slim Brown\n• 1 piteira Alpha\n• 1 isqueiro BIC grande\n• 1 tesoura dobrável prata\n\nO kit completo, com tabaco e tesoura: tudo o que não pode faltar, com produtos selecionados, num kit único e exclusivo Alpha Galerie. Pronto para sair com você a qualquer momento.'
 WHERE nome = 'ALEDA KIT ALPHA' AND subcategoria = 'Kits Exclusivos';

INSERT INTO produtos
  (nome, marca, descricao, categoria_id, subcategoria, preco, preco_promocional, preco_pix,
   imagem_url, estoque, ativo, destaque, destaque_ordem)
SELECT 'ALPHA BIC KIT ALPHA', 'ALPHA', E'Um kit pensado, desenvolvido e exclusivo para quem realmente entende.\n\nEste kit contém:\n• 1 seda Alpha Hemp Brasil Slim Brown\n• 1 piteira Alpha\n• 1 isqueiro BIC grande\n\nO básico que não pode faltar, já com o isqueiro, num kit único e exclusivo Alpha Galerie. Pronto para sair com você a qualquer momento.',
       (SELECT id FROM categorias WHERE nome = 'Headshop'),
       'Kits Exclusivos', 36.00, NULL, 34.00, NULL, 3, false, false, 2
WHERE NOT EXISTS (SELECT 1 FROM produtos WHERE nome = 'ALPHA BIC KIT ALPHA');

UPDATE produtos p SET destaque_ordem = o.ordem
  FROM (SELECT id, row_number() OVER (ORDER BY preco_pix, id) - 1 AS ordem
          FROM produtos
         WHERE subcategoria = 'Kits Exclusivos' AND nome NOT LIKE 'KIT CASE ALPHA%'
           AND (ativo OR nome = 'ALPHA BIC KIT ALPHA')) o
 WHERE p.id = o.id;
