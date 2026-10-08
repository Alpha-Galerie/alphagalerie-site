-- Liquidação de essências (contagem física de 08/10/2026)
--
-- Cada sabor vira um produto próprio, no padrão da loja (King Blunt, NAY),
-- para o estoque bater por sabor. Todos a R$ 15 no Pix e no cartão, com o
-- selo "Sold out" no lugar de "Últimas peças"; quando o estoque zera, o card
-- mostra "Esgotado" e a compra trava. Fotos recortadas da contagem física
-- (public/essencias).

-- 1. Sabores que já tinham cadastro (renomeia e acerta o estoque)
UPDATE produtos SET nome = 'TRESD - BLUE LOOPS', marca = 'TRESD',  estoque = 6 WHERE id = 496;
UPDATE produtos SET nome = 'SMYRNA - BE HAPPY',  marca = 'SMYRNA', estoque = 2 WHERE id = 466;
UPDATE produtos SET nome = 'DEBAJ - EL BERLIM',  marca = 'DEBAJ',  estoque = 4 WHERE id = 42;
UPDATE produtos SET nome = 'FUSION - WILD AFRICA',                 estoque = 1 WHERE id = 424;
UPDATE produtos SET marca = 'MR. LUCKY',                           estoque = 1 WHERE id = 575;

-- 2. Sabores novos
INSERT INTO produtos (nome, marca, categoria_id, subcategoria, preco, estoque, ativo, destaque)
SELECT v.nome, v.marca, 3, 'Essencias', v.preco, v.estoque, true, false
  FROM (VALUES
    ('TRESD - GREEN LOOPS',       'TRESD',  20.00, 5),
    ('SMYRNA - JABUTICABA',       'SMYRNA', 24.00, 2),
    ('DEBAJ - LA NAIROBI',        'DEBAJ',  20.00, 1),
    ('IGNITE - PEACH CANTALOUPE', 'IGNITE', 20.00, 3)
  ) AS v(nome, marca, preco, estoque)
 WHERE NOT EXISTS (SELECT 1 FROM produtos p WHERE p.nome = v.nome);

-- 3. Preço de liquidação + selo em todos os sabores
UPDATE produtos
   SET preco_promocional = 15.00,
       preco_pix         = 15.00,
       sem_estoque       = false,
       etiqueta          = 'Sold out'
 WHERE nome IN ('TRESD - BLUE LOOPS', 'TRESD - GREEN LOOPS',
                'SMYRNA - BE HAPPY', 'SMYRNA - JABUTICABA',
                'DEBAJ - EL BERLIM', 'DEBAJ - LA NAIROBI',
                'FUSION - WILD AFRICA', 'MR. LUCKY - LEMON LIME',
                'IGNITE - PEACH CANTALOUPE');

-- 4. Fotos (servidas pelo site; rodar depois do deploy)
UPDATE produtos p
   SET imagem_url = 'https://www.alphagalerie.com/essencias/' || f.arquivo
  FROM (VALUES
    ('TRESD - BLUE LOOPS',        'tresd-blue-loops.jpg'),
    ('TRESD - GREEN LOOPS',       'tresd-green-loops.jpg'),
    ('SMYRNA - BE HAPPY',         'smyrna-be-happy.jpg'),
    ('SMYRNA - JABUTICABA',       'smyrna-jabuticaba.jpg'),
    ('DEBAJ - EL BERLIM',         'debaj-el-berlim.jpg'),
    ('DEBAJ - LA NAIROBI',        'debaj-la-nairobi.jpg'),
    ('FUSION - WILD AFRICA',      'fusion-wild-africa.jpg'),
    ('IGNITE - PEACH CANTALOUPE', 'ignite-peach-cantaloupe.jpg')
  ) AS f(nome, arquivo)
 WHERE p.nome = f.nome;
