-- Leve 2, pague menos no Pix: preço por unidade quando o carrinho tem 2 ou
-- mais unidades de produtos com este campo (somados entre si, qualquer sabor).
alter table public.produtos add column if not exists preco_pix_leve2 numeric;
comment on column public.produtos.preco_pix_leve2 is 'Preço no Pix de cada unidade quando o carrinho tem 2 ou mais unidades de produtos com este campo preenchido (ex.: juices e salts).';
