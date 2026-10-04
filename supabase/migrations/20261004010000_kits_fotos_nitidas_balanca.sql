-- Kits exclusivos:
--  * fotos mais claras e nítidas, sem o véu do reflexo da vitrine (-v3; o Kit
--    Pronto pra Usar continua com a foto de estúdio -v2);
--  * Kit Case Alpha Completo passa a contar a balança digital de bolso na soma
--    dos itens avulsos (R$ 305 → R$ 360). Preço do kit não muda.
UPDATE produtos
   SET imagem_url = replace(imagem_url, '-v2.jpg', '-v3.jpg')
 WHERE subcategoria = 'Kits Exclusivos'
   AND imagem_url LIKE 'https://www.alphagalerie.com/kits/%-v2.jpg'
   AND imagem_url NOT LIKE '%kit-pronto-pra-usar-v2.jpg';

UPDATE produtos
   SET preco = 360.00,
       descricao = 'Vem no kit: Case Alpha 2.0 + tabaco Yerbinha 15g + isqueiro BIC grande + tesoura dobrável dourada + balança digital de bolso + bowl de silicone Squadafum + triturador Squadafum Poli Grinder + seda Squadafum King Size Slim + piteira Squadafum Large. Separado sai R$ 360,00.'
 WHERE nome = 'KIT CASE ALPHA COMPLETO';
