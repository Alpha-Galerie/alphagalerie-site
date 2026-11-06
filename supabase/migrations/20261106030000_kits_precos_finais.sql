-- Preços finais definidos pela loja (Pix / cartão = Pix + ~5%, redondo).
UPDATE produtos SET preco_pix = 17.00, preco = 18.00 WHERE nome = 'ALPHA KIT ALPHA';
UPDATE produtos SET preco_pix = 25.00, preco = 27.00 WHERE nome = 'ALPHA DUO KIT ALPHA';
UPDATE produtos SET preco_pix = 32.00, preco = 34.00 WHERE nome = 'ALPHA BIC KIT ALPHA';
UPDATE produtos SET preco_pix = 35.00, preco = 37.00 WHERE nome IN ('PAY-PAY KIT ALPHA', 'RAW KIT ALPHA');
UPDATE produtos SET preco_pix = 62.00, preco = 66.00 WHERE nome = 'YERBINHA KIT ALPHA';
UPDATE produtos SET preco_pix = 115.00, preco = 121.00 WHERE nome = 'ALEDA KIT ALPHA';
UPDATE produtos p SET destaque_ordem = o.ordem
  FROM (SELECT id, row_number() OVER (ORDER BY preco_pix, id) - 1 AS ordem
          FROM produtos
         WHERE subcategoria = 'Kits Exclusivos' AND ativo AND nome NOT LIKE 'KIT CASE ALPHA%') o
 WHERE p.id = o.id;
