-- ACREMA PAY-PAY KIT ALPHA: tabaco Acrema + 2 sedas Pay-Pay + piteira Alpha.
-- Compra simulada no Pix: Acrema 32,00 + 2x Pay-Pay 24,00 + piteira Alpha 10,00
-- = 66,00. Kit no piso à vista (Acrema R$ 30): 64,00 → Pix 63,90 / cartão 67,90.
INSERT INTO produtos
  (nome, marca, descricao, categoria_id, subcategoria, preco, preco_promocional, preco_pix,
   imagem_url, estoque, ativo, destaque, destaque_ordem)
SELECT 'ACREMA PAY-PAY KIT ALPHA', 'ALPHA',
       E'Um kit pensado, desenvolvido e exclusivo para quem realmente entende.\n\nEste kit contém:\n• 1 tabaco Acrema Blend 20g\n• 2 sedas Pay-Pay Go Green Slim\n• 1 piteira Alpha\n\nO kit com tabaco: tudo o que não pode faltar, com produtos selecionados, num kit único e exclusivo Alpha Galerie. Pronto para sair com você a qualquer momento.',
       (SELECT id FROM categorias WHERE nome = 'Headshop'),
       'Kits Exclusivos', 67.90, NULL, 63.90,
       'https://www.alphagalerie.com/kits/kit-acrema-pay-pay.jpg', 3, true, false, 4
WHERE NOT EXISTS (SELECT 1 FROM produtos WHERE nome = 'ACREMA PAY-PAY KIT ALPHA');

-- Kits do dia a dia em ordem de preço (Case Alpha seguem no fim, ordem >= 20).
UPDATE produtos p SET destaque_ordem = o.ordem
  FROM (SELECT id, row_number() OVER (ORDER BY preco_pix, id) - 1 AS ordem
          FROM produtos
         WHERE subcategoria = 'Kits Exclusivos' AND ativo AND nome NOT LIKE 'KIT CASE ALPHA%') o
 WHERE p.id = o.id;
