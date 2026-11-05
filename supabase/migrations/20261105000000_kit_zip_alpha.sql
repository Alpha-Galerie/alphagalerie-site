-- Linha Kit Zip: kits do dia a dia no zip transparente Alpha (o cliente
-- reaproveita o zip depois: praia, clube, viagem; a seda não molha nem amassa).
--
-- * Entra o primeiro kit da linha, KIT ZIP ALPHA PAY-PAY.
--   Itens avulsos no site: 2x Pay-Pay Go Green Slim (R$ 13) + piteira Papelito
--   Biodegradável Mega Longa (R$ 14) + zip lock Alpha (R$ 9) = R$ 49,00.
--   Preço do kit: R$ 36,90 (~25% abaixo do avulso, abaixo do avulso no Pix, R$ 45).
-- * Saem do ar os 5 kits sem case (ficam ativo = false, dá pra religar).
--   Ficam os 4 Kits Case Alpha + a linha Kit Zip.
-- * destaque_ordem 0: o Kit Zip aparece primeiro na home e em /kit.

INSERT INTO produtos
  (nome, marca, descricao, categoria_id, subcategoria, preco, preco_promocional, preco_pix,
   imagem_url, estoque, ativo, destaque, destaque_ordem)
SELECT 'KIT ZIP ALPHA PAY-PAY', 'ALPHA',
       'Kit do dia a dia no zip Alpha: 2 sedas Pay-Pay Go Green Slim (alfafa) + piteira Papelito Biodegradável Mega Longa, tudo no zip transparente Alpha Galerie. Não molha, não amassa e o zip fica com você para praia, clube e viagem. Separado sai R$ 49,00.',
       (SELECT id FROM categorias WHERE nome = 'Headshop'),
       'Kits Exclusivos', 49.00, 36.90, 36.90,
       'https://www.alphagalerie.com/kits/kit-zip-alpha-pay-pay.jpg', 10, true, false, 0
WHERE NOT EXISTS (SELECT 1 FROM produtos WHERE nome = 'KIT ZIP ALPHA PAY-PAY');

UPDATE produtos
   SET ativo = false
 WHERE subcategoria = 'Kits Exclusivos'
   AND nome IN ('KIT ESSENCIAL ALPHA', 'KIT PRONTO PRA USAR', 'KIT DUO DE SEDAS',
                'KIT ACREMA', 'KIT ACREMA + TRITURADOR');
