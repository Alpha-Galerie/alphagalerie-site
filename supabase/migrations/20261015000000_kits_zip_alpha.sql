-- Migration: Kits Zip Alpha
--
-- Os kits que vão no saquinho zip transparente com a marca Alpha Galerie.
-- Entram em "Kits Exclusivos" (aparecem na home) e na página /zip, que lista
-- os produtos cujo nome começa com "ZIP ALPHA".
--
-- Preço cheio = soma dos itens avulsos (sai riscado no card); preço do kit =
-- uns 15% abaixo disso, arredondado para baixo em ,90. A tesoura dobrável
-- prata é brinde (veio do fornecedor sem custo) e não entra na conta.
--
--   ZIP ALPHA DUO PAY-PAY: 2 Pay-Pay Go Green (13 + 13) = 26,00 -> 21,90
--   ZIP ALPHA ESSENCIAL:   Alpha Hemp (14) + Mascotte Brown KS (13)
--                          + piteira Papelito Mega Longa (14) = 41,00 -> 33,90
--   ZIP ALPHA PRONTO:      Alpha Hemp (14) + seda King Size Slim (13)
--                          + piteira Nowdays (12,90) + BIC grande (16) = 55,90 -> 46,90
--
-- O kit com tabaco (foto zip-blend.webp) fica para depois: falta definir o tabaco.
--
-- Estoque inicial: a seda Alpha Hemp tinha só 6 unidades em 14/10/2026, por
-- isso os kits com ela começam com 3. Ajuste na retaguarda conforme montar.
--
-- Entram DESLIGADOS (ativo = false): as fotos ficam em /public/kits/zip e só
-- existem no site depois do deploy. Depois do deploy:
--   update produtos set ativo = true where nome like 'ZIP ALPHA%';
--
-- Vender um kit não baixa o estoque dos itens avulsos.

INSERT INTO produtos
  (nome, marca, descricao, categoria_id, subcategoria, preco, preco_promocional, preco_pix,
   imagem_url, estoque, ativo, destaque, destaque_ordem)
SELECT v.nome, 'ALPHA', v.descricao,
       (SELECT id FROM categorias WHERE nome = 'Headshop'),
       'Kits Exclusivos', v.preco, v.kit, v.kit,
       'https://www.alphagalerie.com/kits/zip/' || v.foto, v.estoque, false, false, v.ordem
FROM (VALUES
  (0, 'ZIP ALPHA DUO PAY-PAY', 'zip-duo.webp', 26.00, 21.90, 10,
   'Vem no zip: 2 sedas Pay-Pay Go Green Slim + tesoura dobrável prata de brinde. Separado sai R$ 26,00. E o zip transparente com a marca Alpha fica com você.'),
  (0, 'ZIP ALPHA ESSENCIAL', 'zip-essencial.webp', 41.00, 33.90, 3,
   'Vem no zip: seda Alpha Hemp Slim Brown + seda Mascotte Slim + piteira Papelito Mega Longa. Separado sai R$ 41,00. E o zip transparente com a marca Alpha fica com você.'),
  (0, 'ZIP ALPHA PRONTO', 'zip-pronto.webp', 55.90, 46.90, 3,
   'Vem no zip: seda Alpha Hemp Slim Brown + seda King Size Slim + piteira Nowdays + isqueiro BIC grande. Separado sai R$ 55,90. E o zip transparente com a marca Alpha fica com você.')
) AS v(ordem, nome, foto, preco, kit, estoque, descricao)
WHERE NOT EXISTS (SELECT 1 FROM produtos p WHERE p.nome = v.nome);
