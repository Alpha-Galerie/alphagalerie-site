-- ACREMA KIT ALPHA: segundo kit do dia a dia no Alpha Pocket, o único com
-- tabaco. R$ 119,90 no cartão, R$ 114,90 no Pix.
--
-- Itens (preço cheio no site / menor preço à vista que a loja pratica):
--   tabaco Acrema Blend 20g ............ R$ 35,00 / R$ 30,00
--   seda Alpha Hemp Slim Brown ......... R$ 14,00 / R$ 10,00
--   seda Mascotte Slim Brown ........... R$ 13,00 / R$ 10,00
--   piteira Alpha ...................... R$ 12,00 / R$ 10,00
--   triturador Papelito ................ R$ 43,00 / R$ 40,00
--   isqueiro BIC grande ................ R$ 16,00 / R$ 15,00
--   total .............................. R$ 133,00 / R$ 115,00
-- O Pix do kit fica no piso à vista dos itens e o Alpha Pocket (R$ 3,58)
-- vai incluso. Sem preço riscado: o cliente vê só o preço do kit.

INSERT INTO produtos
  (nome, marca, descricao, categoria_id, subcategoria, preco, preco_promocional, preco_pix,
   imagem_url, estoque, ativo, destaque, destaque_ordem)
SELECT 'ACREMA KIT ALPHA', 'ALPHA',
       E'Um kit pensado, desenvolvido e exclusivo para quem realmente entende.\n\nEste kit contém:\n• 1 tabaco Acrema Blend 20g\n• 1 seda Alpha Hemp Slim Brown\n• 1 seda Mascotte Slim Brown\n• 1 piteira Alpha\n• 1 triturador Papelito\n• 1 isqueiro BIC\n\nTudo no Alpha Pocket, exclusivo Alpha Galerie.\n\nO kit completo, com tabaco: tudo o que não pode faltar, reunido num só lugar. Produtos de qualidade, protegidos e prontos para sair com você a qualquer momento.',
       (SELECT id FROM categorias WHERE nome = 'Headshop'),
       'Kits Exclusivos', 119.90, NULL, 114.90,
       'https://www.alphagalerie.com/kits/kit-acrema-alpha.jpg', 10, true, false, 1
WHERE NOT EXISTS (SELECT 1 FROM produtos WHERE nome = 'ACREMA KIT ALPHA');
