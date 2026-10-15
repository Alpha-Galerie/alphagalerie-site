-- Migration: linha Session (kits exclusivos)
--
-- Session é a linha de kits exclusivos da Alpha Galerie para o rolê. Cada
-- edição tem número e cor (Nº01 Lima, Nº02 Kraft, Nº03 Céu) e vem numa
-- embalagem transparente exclusiva com a marca. Os kits entram em "Kits
-- Exclusivos" (aparecem na home) e na página /session, que lista os produtos
-- cujo nome começa com "SESSION ".
--
-- Preço cheio = soma dos itens avulsos (sai riscado no card); preço do kit =
-- uns 15% abaixo disso, arredondado para baixo em ,90. A tesoura dobrável
-- prata é brinde (veio do fornecedor sem custo) e não entra na conta.
--
--   SESSION 01 LIMA:  2 Pay-Pay Go Green (13 + 13) = 26,00 -> 21,90
--   SESSION 02 KRAFT: Alpha Hemp (14) + Mascotte Brown KS (13)
--                     + piteira Papelito Mega Longa (14) = 41,00 -> 33,90
--   SESSION 03 CEU:   Alpha Hemp (14) + seda King Size Slim (13)
--                     + piteira Nowdays (12,90) + BIC grande (16) = 55,90 -> 46,90
--
-- A edição com tabaco (foto session-04.webp) fica para depois: falta definir
-- o tabaco. Nomes e preços ainda podem mudar na retaguarda.
--
-- Estoque inicial: a seda Alpha Hemp tinha só 6 unidades em 14/10/2026, por
-- isso as edições com ela começam com 3. Ajuste na retaguarda conforme montar.
--
-- Entram DESLIGADOS (ativo = false): as fotos ficam em /public/kits/session e
-- só existem no site depois do deploy. Depois do deploy:
--   update produtos set ativo = true where nome like 'SESSION %';
--
-- Vender um kit não baixa o estoque dos itens avulsos.

INSERT INTO produtos
  (nome, marca, descricao, categoria_id, subcategoria, preco, preco_promocional, preco_pix,
   imagem_url, estoque, ativo, destaque, destaque_ordem)
SELECT v.nome, 'ALPHA', v.descricao,
       (SELECT id FROM categorias WHERE nome = 'Headshop'),
       'Kits Exclusivos', v.preco, v.kit, v.kit,
       'https://www.alphagalerie.com/kits/session/' || v.foto, v.estoque, false, false, v.ordem
FROM (VALUES
  (0, 'SESSION 01 LIMA', 'session-01.webp', 26.00, 21.90, 10,
   'Kit exclusivo da linha Session: 2 sedas Pay-Pay Go Green Slim + tesoura dobrável prata de brinde. Acompanha a embalagem exclusiva Alpha Galerie. Separado sai R$ 26,00.'),
  (0, 'SESSION 02 KRAFT', 'session-02.webp', 41.00, 33.90, 3,
   'Kit exclusivo da linha Session: seda Alpha Hemp Slim Brown + seda Mascotte Slim + piteira Papelito Mega Longa. Acompanha a embalagem exclusiva Alpha Galerie. Separado sai R$ 41,00.'),
  (0, 'SESSION 03 CEU', 'session-03.webp', 55.90, 46.90, 3,
   'Kit exclusivo da linha Session: seda Alpha Hemp Slim Brown + seda King Size Slim + piteira Nowdays + isqueiro BIC grande. Acompanha a embalagem exclusiva Alpha Galerie. Separado sai R$ 55,90.')
) AS v(ordem, nome, foto, preco, kit, estoque, descricao)
WHERE NOT EXISTS (SELECT 1 FROM produtos p WHERE p.nome = v.nome);
