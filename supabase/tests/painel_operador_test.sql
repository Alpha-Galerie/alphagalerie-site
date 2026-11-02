-- Testes do painel do operador (migração 20261019000000_painel_operador.sql).
--
-- Rodam num Postgres vazio, sem Supabase: o bloco "fixture" recria só o que as
-- migrações usam, e aplica a baixa de estoque real para testar a integração.
--
--   createdb operador_test
--   psql -d operador_test -v ON_ERROR_STOP=1 -f supabase/tests/painel_operador_test.sql
--
-- Cada verificação imprime "ok  <descrição>"; a primeira falha aborta.

-- ── fixture ──────────────────────────────────────────────────────────────
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role; end if;
end $$;
create schema auth;
-- o papel do login vem de teste.papel (operador, admin ou vazio)
create function auth.jwt() returns jsonb language sql stable as $$
  select jsonb_build_object('app_metadata', jsonb_build_object('role', nullif(current_setting('teste.papel', true), '')))
$$;
create function auth.role() returns text language sql stable as $$
  select case when coalesce(current_setting('teste.papel', true), '') = '' then 'anon' else 'authenticated' end
$$;
grant usage on schema auth to anon, authenticated;
grant execute on all functions in schema auth to anon, authenticated;
grant usage on schema public to anon, authenticated;

create table produtos (id bigserial primary key, codigo text, nome text, marca text, subcategoria text, preco numeric, preco_pix numeric, preco_promocional numeric, estoque integer, imagem_url text, ativo boolean default true);
create table variacoes (id bigserial primary key, produto_id bigint not null, nome text not null, preco numeric, estoque integer not null default 0, ordem integer not null default 0, ativo boolean not null default true);
create table pedidos (id bigserial primary key, numero text not null unique, cliente_id bigint, cliente_nome text not null, cliente_whatsapp text not null, cliente_email text, cliente_endereco text, subtotal numeric not null, frete numeric default 0, total numeric not null, forma_pagamento text, status text default 'novo', observacoes text, criado_em timestamptz default now(), atualizado_em timestamptz default now(), tipo_entrega text default 'entrega', mp_payment_id text, mp_preference_id text);
create table pedido_itens (id bigserial primary key, pedido_id bigint references pedidos(id) on delete cascade, produto_id bigint references produtos(id), produto_nome text not null, produto_codigo text, quantidade integer not null, preco_unitario numeric not null, subtotal numeric not null, variacao_id bigint);
create table pedido_status (slug text primary key, nome text, cor text, conta_como text, ordem int, sistema boolean default true);
insert into pedido_status values
  ('novo','Novo','#60a5fa','novo',10,true),
  ('aguardando_pagamento','Aguard. pagamento','#f59e0b','aguardando_pagamento',20,true),
  ('pendente','Pendente (site)','#f59e0b','aguardando_pagamento',15,true),
  ('pago','Pago','#fbbf24','pago',30,true),
  ('aguardando_coleta','Aguardando coleta','#c9a961','pago',35,false),
  ('enviado','Enviado','#4ade80','enviado',40,true),
  ('entregue','Entregue','#888','entregue',50,true),
  ('cancelado','Cancelado','#ef4444','cancelado',60,true);
create function status_base(p_status text) returns text language sql stable security definer
  set search_path = public, pg_catalog
  as $$ select coalesce((select conta_como from pedido_status where slug = p_status), p_status) $$;

\ir ../migrations/20261008020000_pedidos_baixa_estoque.sql
\ir ../migrations/20261019000000_painel_operador.sql

-- ── dados ────────────────────────────────────────────────────────────────
insert into produtos (id, codigo, nome, marca, preco, preco_pix, preco_promocional, estoque, ativo) values
  (1, 'SED', 'Seda King', 'Raw', 12, 10, null, 5, true),       -- Pix menor: 10
  (2, 'KIT', 'Kit Case', 'Alpha', 200, 190, 150, 2, true),     -- promo 150; Pix 190 não é menor: 150
  (3, 'ESS', 'Essência', 'Ziggy', 25, null, null, null, true), -- só variações
  (4, 'OFF', 'Fora de linha', 'X', 50, null, null, 9, false),
  (5, 'LIV', 'Sem controle', 'Y', 30, null, null, null, true); -- estoque NULL = sem controle
insert into variacoes (id, produto_id, nome, preco, estoque) values
  (31, 3, 'Morango', null, 4),
  (32, 3, 'Uva', 18, 1);
-- pedidos do site: um pago, um pendente (checkout abandonado)
insert into pedidos (id, numero, cliente_nome, cliente_whatsapp, subtotal, total, forma_pagamento, status, tipo_entrega, estoque_baixado)
values (100, 'AG1', 'Site Pago', '11999990000', 24, 24, 'pix', 'pago', 'delivery', true),
       (101, 'AG2', 'Site Pendente', '11999990001', 24, 24, 'cartao', 'pendente', 'delivery', false);
insert into pedido_itens (pedido_id, produto_id, produto_nome, quantidade, preco_unitario, subtotal)
values (100, 1, 'Seda King', 2, 12, 24), (101, 1, 'Seda King', 2, 12, 24);

-- ── cenários ─────────────────────────────────────────────────────────────
\set ON_ERROR_STOP 1
create or replace function pg_temp.eq(got anyelement, want anyelement, msg text) returns void language plpgsql as $$
begin if got is distinct from want then raise exception 'FAIL %: got % want %', msg, got, want; end if; raise notice 'ok  %', msg; end $$;

-- sem papel: tudo fechado
set teste.papel = '';
set role authenticated;
do $$ begin
  perform operador_pedidos(30);
  raise exception 'FAIL login sem papel listou pedidos';
exception when insufficient_privilege then raise notice 'ok  login sem papel não lista pedidos';
end $$;
reset role;

set role anon;
do $$ begin
  perform operador_produtos();
  raise exception 'FAIL anon chamou o painel';
exception when insufficient_privilege then raise notice 'ok  anon não chama o painel';
end $$;
reset role;

set teste.papel = 'operador';
set role authenticated;

-- lista: pago do site sim, pendente do site não, e sem valores
select pg_temp.eq(jsonb_array_length(operador_pedidos(30)), 1, 'lista só o pedido pago do site');
select pg_temp.eq((operador_pedidos(30) -> 0 ->> 'numero'), 'AG1', 'pedido pago listado');
select pg_temp.eq((operador_pedidos(30) -> 0) ? 'total', false, 'lista não mostra total');
select pg_temp.eq((operador_pedidos(30) -> 0 ->> 'valor_pix'), null, 'pedido do site não mostra valor');
select pg_temp.eq((operador_pedidos(30) -> 0 -> 'itens' -> 0 ->> 'quantidade'), '2', 'lista traz os itens');

-- produtos: só ativos, com variações
select pg_temp.eq(jsonb_array_length(operador_produtos()), 4, 'estoque lista só ativos');
select pg_temp.eq((select jsonb_array_length(e -> 'variacoes') from jsonb_array_elements(operador_produtos()) e where e ->> 'id' = '3'), 2, 'produto traz as variações');

-- pedido manual: validações
select pg_temp.eq(operador_criar_pedido('{"cliente_nome":"","cliente_whatsapp":"11988887777","tipo_entrega":"retirada","itens":[{"produto_id":1,"quantidade":1}]}') ->> 'success', 'false', 'exige nome');
select pg_temp.eq(operador_criar_pedido('{"cliente_nome":"Ana","cliente_whatsapp":"1198","tipo_entrega":"retirada","itens":[{"produto_id":1,"quantidade":1}]}') ->> 'success', 'false', 'exige WhatsApp com DDD');
select pg_temp.eq(operador_criar_pedido('{"cliente_nome":"Ana","cliente_whatsapp":"11988887777","tipo_entrega":"delivery","itens":[{"produto_id":1,"quantidade":1}]}') ->> 'success', 'false', 'delivery exige endereço');
select pg_temp.eq(operador_criar_pedido('{"cliente_nome":"Ana","cliente_whatsapp":"11988887777","tipo_entrega":"retirada","itens":[]}') ->> 'success', 'false', 'exige produto');
select pg_temp.eq(operador_criar_pedido('{"cliente_nome":"Ana","cliente_whatsapp":"11988887777","tipo_entrega":"retirada","itens":[{"produto_id":4,"quantidade":1}]}') ->> 'success', 'false', 'recusa produto inativo');
select pg_temp.eq(operador_criar_pedido('{"cliente_nome":"Ana","cliente_whatsapp":"11988887777","tipo_entrega":"retirada","itens":[{"produto_id":3,"quantidade":1}]}') ->> 'success', 'false', 'exige variação quando o produto tem');
select pg_temp.eq(operador_criar_pedido('{"cliente_nome":"Ana","cliente_whatsapp":"11988887777","tipo_entrega":"retirada","itens":[{"produto_id":1,"quantidade":4},{"produto_id":1,"quantidade":2}]}') ->> 'success', 'false', 'soma linhas repetidas antes de conferir estoque');
select pg_temp.eq(operador_criar_pedido('{"cliente_nome":"Ana","cliente_whatsapp":"11988887777","tipo_entrega":"retirada","itens":[{"produto_id":3,"variacao_id":32,"quantidade":2}]}') ->> 'success', 'false', 'confere estoque da variação');

-- pedido manual: preço do banco, frete, aguardando Pix
do $$
declare r jsonb;
begin
  r := operador_criar_pedido(jsonb_build_object(
    'cliente_nome', 'Bruno', 'cliente_whatsapp', '(11) 97777-6666',
    'cliente_endereco', 'Rua A, 10', 'tipo_entrega', 'delivery', 'frete', 12.5,
    'observacoes', 'portão azul',
    'itens', jsonb_build_array(
      jsonb_build_object('produto_id', 1, 'quantidade', 2, 'preco_unitario', 1),  -- preço do navegador é ignorado
      jsonb_build_object('produto_id', 2, 'quantidade', 1),
      jsonb_build_object('produto_id', 3, 'variacao_id', 31, 'quantidade', 1),
      jsonb_build_object('produto_id', 3, 'variacao_id', 32, 'quantidade', 1),
      jsonb_build_object('produto_id', 5, 'quantidade', 3))));
  perform pg_temp.eq(r ->> 'success', 'true', 'cria pedido manual');
  -- 2×10 (Pix) + 150 (promo) + 25 (variação sem preço usa o do produto) + 18 (variação com preço) + 3×30
  perform pg_temp.eq((r ->> 'subtotal')::numeric, 303::numeric, 'preço Pix/promo/variação calculado no banco');
  perform pg_temp.eq((r ->> 'total')::numeric, 315.5::numeric, 'total soma o frete');
  perform set_config('teste.manual', r ->> 'id', false);
end $$;

-- conferências direto nas tabelas, fora do papel do operador
reset role;
select pg_temp.eq((select status from pedidos where id = current_setting('teste.manual')::bigint), 'aguardando_pagamento', 'manual nasce aguardando Pix');
select pg_temp.eq((select origem from pedidos where id = current_setting('teste.manual')::bigint), 'operador', 'manual marcado como do operador');
select pg_temp.eq((select cliente_whatsapp from pedidos where id = current_setting('teste.manual')::bigint), '11977776666', 'WhatsApp só com dígitos');
select pg_temp.eq((select estoque from produtos where id = 1), 5, 'manual não baixa estoque antes do Pix');
set role authenticated;

-- retirada zera o frete
select pg_temp.eq((operador_criar_pedido('{"cliente_nome":"Caio","cliente_whatsapp":"11966665555","tipo_entrega":"retirada","frete":20,"itens":[{"produto_id":1,"quantidade":1}]}') ->> 'frete')::numeric, 0::numeric, 'retirada não cobra frete');

-- manual aguardando aparece com o valor do Pix
select pg_temp.eq((select (e ->> 'valor_pix')::numeric from jsonb_array_elements(operador_pedidos(30)) e where (e ->> 'id')::bigint = current_setting('teste.manual')::bigint), 315.5::numeric, 'manual aguardando mostra o valor do Pix');

-- status: operador não marca pago nem anda com pedido não pago
select pg_temp.eq(operador_mudar_status(current_setting('teste.manual')::bigint, 'pago') ->> 'success', 'false', 'operador não marca como pago');
select pg_temp.eq(operador_mudar_status(current_setting('teste.manual')::bigint, 'enviado') ->> 'success', 'false', 'não envia pedido sem pagamento');
select pg_temp.eq(operador_mudar_status(101, 'cancelado') ->> 'success', 'false', 'não cancela pedido do site');
select pg_temp.eq(operador_mudar_status(100, 'cancelado') ->> 'success', 'false', 'não cancela pedido pago');

-- dono confirma o Pix → baixa estoque; operador anda com o pedido
reset role;
update pedidos set status = 'pago' where id = current_setting('teste.manual')::bigint;
select pg_temp.eq((select estoque from produtos where id = 1), 3, 'Pix confirmado baixa o produto');
select pg_temp.eq((select estoque from variacoes where id = 31), 3, 'Pix confirmado baixa a variação');
set role authenticated;
select pg_temp.eq(operador_mudar_status(current_setting('teste.manual')::bigint, 'aguardando_coleta') ->> 'success', 'true', 'separado: aguardando coleta');
select pg_temp.eq(operador_mudar_status(current_setting('teste.manual')::bigint, 'enviado') ->> 'success', 'true', 'saiu para entrega');
select pg_temp.eq(operador_mudar_status(current_setting('teste.manual')::bigint, 'entregue') ->> 'success', 'true', 'entregue');
reset role;
select pg_temp.eq((select estoque from produtos where id = 1), 3, 'andar com o pedido não baixa de novo');
set role authenticated;

-- cancelar manual ainda não pago
do $$
declare r jsonb;
begin
  r := operador_criar_pedido('{"cliente_nome":"Duda","cliente_whatsapp":"11955554444","tipo_entrega":"retirada","itens":[{"produto_id":1,"quantidade":1}]}');
  perform pg_temp.eq(operador_mudar_status((r ->> 'id')::bigint, 'cancelado') ->> 'success', 'true', 'cancela manual não pago');
end $$;
reset role;
select pg_temp.eq((select estoque from produtos where id = 1), 3, 'cancelar não pago não mexe no estoque');

-- admin também abre o painel
set teste.papel = 'admin';
set role authenticated;
select pg_temp.eq(jsonb_typeof(operador_pedidos(30)), 'array', 'admin abre o painel');
reset role;

\echo 'todos os testes do painel do operador passaram'
