-- Foto por variação: cada sabor de e-liquid/salt (e cada coil) mostra o
-- próprio frasco na escolha. Sem foto, o site usa a do produto.
alter table public.variacoes add column if not exists imagem_url text;
