-- Kits exclusivos: fotos novas com cenário (pedra e sombra de folhagem), sem a
-- moldura branca. Nome novo de arquivo porque as imagens têm cache de 1 ano.
UPDATE produtos
   SET imagem_url = replace(imagem_url, '.jpg', '-v2.jpg')
 WHERE subcategoria = 'Kits Exclusivos'
   AND imagem_url LIKE 'https://www.alphagalerie.com/kits/%'
   AND imagem_url NOT LIKE '%-v2.jpg';
