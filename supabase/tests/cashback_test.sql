-- Testes do cashback (migração 20260924000000_cashback.sql).
--
-- Rodam num Postgres vazio, sem Supabase: o bloco "fixture" recria só o que a
-- migração usa (papéis, auth.*, is_admin, configuracoes, pedidos).
--
--   createdb cashback_test
--   psql -d cashback_test -v ON_ERROR_STOP=1 \
--     -f supabase/tests/cashback_test.sql
--
-- (o arquivo aplica a migração no meio, com \ir)
-- Cada verificação imprime "ok  <descrição>"; a primeira falha aborta.

-- ── fixture ──────────────────────────────────────────────────────────────
do $$ begin
  -- papéis são do cluster: podem existir de um banco de teste anterior
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role; end if;
end $$;
create schema auth;
create function auth.role() returns text language sql as $$ select 'anon' $$;
create function auth.jwt() returns jsonb language sql as $$ select '{}'::jsonb $$;
create function public.is_admin() returns boolean language sql stable as $$ select false $$;
create table configuracoes (id bigserial primary key, chave text unique, valor text, criado_em timestamptz default now(), descricao text, atualizado_em timestamptz);
create table pedidos (id bigserial primary key, numero text, cliente_id bigint, cliente_nome text, cliente_whatsapp text, cliente_email text, cliente_endereco text, subtotal numeric, frete numeric, total numeric, forma_pagamento text, status text, observacoes text, criado_em timestamptz default now(), atualizado_em timestamptz, tipo_entrega text, mp_payment_id text, mp_preference_id text);
create table pedido_itens (id bigserial primary key, pedido_id bigint references pedidos(id), produto_id bigint, produto_nome text, produto_codigo text, quantidade int, preco_unitario numeric, subtotal numeric, variacao_id bigint);
create function create_order_with_items(p_numero text, p_cliente_nome text, p_cliente_whatsapp text, p_cliente_email text DEFAULT NULL, p_cliente_endereco text DEFAULT NULL, p_forma_pagamento text DEFAULT 'pix', p_tipo_entrega text DEFAULT 'sedex', p_observacoes text DEFAULT NULL, p_subtotal numeric DEFAULT 0, p_total numeric DEFAULT 0, p_itens jsonb DEFAULT '[]') returns jsonb language sql as $$ select '{}'::jsonb $$;

-- ── migração ─────────────────────────────────────────────────────────────
\ir ../migrations/20260924000000_cashback.sql

-- ── cenários ─────────────────────────────────────────────────────────────
\set ON_ERROR_STOP 1
create or replace function pg_temp.eq(got anyelement, want anyelement, msg text) returns void language plpgsql as $$
begin if got is distinct from want then raise exception 'FAIL %: got % want %', msg, got, want; end if; raise notice 'ok  %', msg; end $$;
grant select on cashback_creditos, cashback_usos to anon;
grant usage on schema public to anon;

set role anon;
select create_order_with_items('A1','Ana','(11) 99999-0001',null,null,'pix','delivery',null,120,130,'[{"produto_id":1,"produto_nome":"Seda","quantidade":1,"preco_unitario":120,"subtotal":120}]'::jsonb,10,true) as r \gset
select pg_temp.eq((:'r'::jsonb->>'cashback_usado')::numeric, 0::numeric, 'primeiro pedido sem saldo não usa cashback');
select pg_temp.eq((select count(*) from cashback_creditos), 0::bigint, 'anon não lê créditos (RLS)');
reset role;

select pg_temp.eq((select count(*) from cashback_creditos), 0::bigint, 'pedido pendente não gera crédito');
update pedidos set status='pago' where numero='A1';
select pg_temp.eq((select valor from cashback_creditos), 120.00::numeric, 'pago gera 1:1 sobre total - frete');
select pg_temp.eq((select expira_em from cashback_creditos), ((((now() at time zone 'America/Sao_Paulo')::date + 31)::timestamp) at time zone 'America/Sao_Paulo'), 'vale até o fim do 30º dia');
update pedidos set status='enviado' where numero='A1';
update pedidos set status='entregue' where numero='A1';
select pg_temp.eq((select count(*) from cashback_creditos), 1::bigint, 'enviado/entregue não duplicam');

set role anon;
select pg_temp.eq((select saldo from consultar_cashback('5511999990001')), 120.00::numeric, 'consulta com 55 na frente');
select pg_temp.eq((select saldo from consultar_cashback('11 99999-0001')), 120.00::numeric, 'consulta com máscara');
select pg_temp.eq((select saldo from consultar_cashback('')), 0::numeric, 'consulta vazia');
select pg_temp.eq((select percentual from cashback_regras()), 100::numeric, 'regras públicas');

select create_order_with_items('B1','Ana','11999990001',null,null,'pix','delivery',null,100,100,'[{"produto_id":2,"produto_nome":"Piteira","quantidade":1,"preco_unitario":90,"subtotal":90}]'::jsonb,10,true) as r \gset
select pg_temp.eq((:'r'::jsonb->>'cashback_usado')::numeric, 45.00::numeric, 'uso limitado a 50% dos produtos (sem frete)');
select pg_temp.eq((:'r'::jsonb->>'total')::numeric, 55.00::numeric, 'total já sai com desconto');
select pg_temp.eq((select saldo from consultar_cashback('11999990001')), 75.00::numeric, 'saldo reservado no pedido');

select create_order_with_items('C1','Ana','11999990001',null,null,'pix','delivery',null,100,100,'[]'::jsonb,10,false) as r \gset
select pg_temp.eq((:'r'::jsonb->>'cashback_usado')::numeric, 0::numeric, 'sem marcar usar, não usa');
select create_order_with_items('D1','Ana','11999990001',null,null,'pix','delivery',null,10,10) as r \gset
select pg_temp.eq((:'r'::jsonb->>'success')::boolean, true, 'chamada antiga (sem params novos) funciona');
reset role;

update pedidos set status='pago' where numero='B1';
select pg_temp.eq((select valor from cashback_creditos c join pedidos p on p.id=c.pedido_id where numero='B1'), 45.00::numeric, 'crédito sobre o que pagou (55-10), cashback não gera cashback');
select pg_temp.eq((select saldo from consultar_cashback('11999990001')), 120.00::numeric, 'saldo 75 + 45');

update pedidos set status='cancelado' where numero='B1';
select pg_temp.eq((select saldo from consultar_cashback('11999990001')), 120.00::numeric, 'cancelou: devolve 45 usado e estorna 45 ganho');
select pg_temp.eq((select saldo from cashback_creditos c join pedidos p on p.id=c.pedido_id where numero='A1'), 120.00::numeric, 'crédito A restaurado');

update pedidos set status='pago' where numero='B1';
select pg_temp.eq((select saldo from cashback_creditos c join pedidos p on p.id=c.pedido_id where numero='A1'), 75.00::numeric, 'reativou: volta a consumir');
select pg_temp.eq((select saldo from cashback_creditos c join pedidos p on p.id=c.pedido_id where numero='B1'), 45.00::numeric, 'reativou: crédito B volta');

-- pendente cancelado devolve reserva
set role anon;
select create_order_with_items('E1','Ana','11999990001',null,null,'pix','delivery',null,500,500,'[]'::jsonb,0,true) as r \gset
select pg_temp.eq((:'r'::jsonb->>'cashback_usado')::numeric, 120.00::numeric, 'usa saldo inteiro quando cabe no teto');
reset role;
select pg_temp.eq((select saldo from consultar_cashback('11999990001')), 0::numeric, 'zerou');
select pg_temp.eq((select string_agg(c.id::text||':'||u.valor, ',' order by c.expira_em, c.id) from cashback_usos u join cashback_creditos c on c.id=u.credito_id join pedidos p on p.id=u.pedido_id where p.numero='E1'), (select string_agg(c.id::text||':'||c2, ',' order by c.expira_em, c.id) from cashback_creditos c cross join lateral (select case when c.valor=120 then 75.00 else 45.00 end c2) x), 'consumiu os dois créditos');
update pedidos set status='cancelado' where numero='E1';
select pg_temp.eq((select saldo from consultar_cashback('11999990001')), 120.00::numeric, 'pedido abandonado devolve reserva');

-- vencido não conta
update cashback_creditos set expira_em = now() - interval '1 minute' where valor=45;
select pg_temp.eq((select saldo from consultar_cashback('11999990001')), 75.00::numeric, 'vencido não conta');

-- insert anônimo já pago não credita
insert into pedidos (numero, cliente_nome, cliente_whatsapp, total, frete, status) values ('F1','X','11988887777',1000,0,'pago');
select pg_temp.eq((select saldo from consultar_cashback('11988887777')), 0::numeric, 'insert com status pago não gera crédito');

-- config ajustável
update configuracoes set valor='10' where chave='cashback_percentual';
insert into pedidos (numero, cliente_nome, cliente_whatsapp, total, frete, status) values ('G1','Y','11977776666',200,20,'pendente');
update pedidos set status='pago' where numero='G1';
select pg_temp.eq((select saldo from consultar_cashback('11977776666')), 18.00::numeric, 'percentual configurável (10%)');

-- telefone inválido não credita
insert into pedidos (numero, cliente_nome, cliente_whatsapp, total, frete, status) values ('H1','Z','123',200,0,'pendente');
update pedidos set status='pago' where numero='H1';
select pg_temp.eq((select count(*) from cashback_creditos c join pedidos p on p.id=c.pedido_id where numero='H1'), 0::bigint, 'telefone inválido não gera crédito');
