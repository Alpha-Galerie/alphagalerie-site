-- Ajuste de preço dos kits pedido pela loja (Pix / cartão = Pix + ~5%).
UPDATE produtos SET preco_pix = 28.90, preco = 30.90 WHERE nome = 'ALPHA DUO KIT ALPHA';
UPDATE produtos SET preco_pix = 34.90, preco = 36.90 WHERE nome = 'PAY-PAY KIT ALPHA';
UPDATE produtos SET preco_pix = 35.90, preco = 37.90 WHERE nome = 'RAW KIT ALPHA';
UPDATE produtos SET preco_pix = 129.90, preco = 136.90 WHERE nome IN ('HASH KIT ALPHA', 'ALEDA KIT ALPHA');
