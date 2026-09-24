-- Testes do Alpha Club (migração 20260925000000_alpha_club.sql).
--
-- Rodam num Postgres vazio, sem Supabase: o bloco "fixture" recria só o que as
-- migrações usam. Aplica o cashback antigo antes, para testar a troca também.
--
--   createdb clube_test
--   psql -d clube_test -v ON_ERROR_STOP=1 -f supabase/tests/alpha_club_test.sql
--
-- Cada verificação imprime "ok  <descrição>"; a primeira falha aborta.

-- ── fixture ──────────────────────────────────────────────────────────────
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role; end if;
end $$;
create schema auth;
create function auth.role() returns text language sql as $$ select 'anon' $$;
create function auth.jwt() returns jsonb language sql as $$ select '{}'::jsonb $$;
-- admin quando a sessão marcar teste.admin = sim
create function public.is_admin() returns boolean language sql stable
  as $$ select coalesce(current_setting('teste.admin', true), '') = 'sim' $$;
create table configuracoes (id bigserial primary key, chave text unique, valor text, criado_em timestamptz default now(), descricao text, atualizado_em timestamptz);
create table produtos (id bigserial primary key, nome text, preco numeric, preco_promocional numeric, ativo boolean default true);
create table variacoes (id bigserial primary key, produto_id bigint, nome text, preco numeric);
create table pedidos (id bigserial primary key, numero text, cliente_id bigint, cliente_nome text, cliente_whatsapp text, cliente_email text, cliente_endereco text, subtotal numeric, frete numeric, total numeric, forma_pagamento text, status text, observacoes text, criado_em timestamptz default now(), atualizado_em timestamptz, tipo_entrega text, mp_payment_id text, mp_preference_id text);
create table pedido_itens (id bigserial primary key, pedido_id bigint references pedidos(id), produto_id bigint, produto_nome text, produto_codigo text, quantidade int, preco_unitario numeric, subtotal numeric, variacao_id bigint);
create table cupons (id bigserial primary key, codigo text not null unique, tipo text not null default 'pct' check (tipo in ('pct','fixo','frete')), valor numeric not null default 0, descricao text, ativo boolean not null default true, validade date, valor_minimo numeric not null default 0, limite_usos integer, usos integer not null default 0, criado_em timestamptz not null default now());
create function create_order_with_items(p_numero text, p_cliente_nome text, p_cliente_whatsapp text, p_cliente_email text DEFAULT NULL, p_cliente_endereco text DEFAULT NULL, p_forma_pagamento text DEFAULT 'pix', p_tipo_entrega text DEFAULT 'sedex', p_observacoes text DEFAULT NULL, p_subtotal numeric DEFAULT 0, p_total numeric DEFAULT 0, p_itens jsonb DEFAULT '[]') returns jsonb language sql as $$ select '{}'::jsonb $$;
create function validar_cupom(p_codigo text, p_subtotal numeric default 0) returns table(codigo text, tipo text, valor numeric, descricao text) language sql as $$ select null::text, null::text, null::numeric, null::text where false $$;

-- ── migrações ────────────────────────────────────────────────────────────
\ir ../migrations/20260924000000_cashback.sql
\ir ../migrations/20260924000100_cashback_fecha_funcoes_internas.sql
\ir ../migrations/20260924000200_cashback_base_ate_subtotal.sql
\ir ../migrations/20260925000000_alpha_club.sql

-- ── cenários ─────────────────────────────────────────────────────────────
\set ON_ERROR_STOP 1
create or replace function pg_temp.eq(got anyelement, want anyelement, msg text) returns void language plpgsql as $$
begin if got is distinct from want then raise exception 'FAIL %: got % want %', msg, got, want; end if; raise notice 'ok  %', msg; end $$;
create or replace function pg_temp.saldo(w text) returns int language sql as $$ select (consultar_clube(w)->>'pontos')::int $$;
grant usage on schema public to anon;
grant select on clube_pontos, clube_membros to anon;

insert into produtos (id, nome, preco, preco_promocional) values (1, 'Seda', 10, null), (2, 'Piteira', 20, 15);
select to_char(now() at time zone 'America/Sao_Paulo', 'MM')::int as mes_atual \gset
select ((:mes_atual % 12) + 1) as outro_mes \gset

-- troca de modelo
select pg_temp.eq(to_regclass('public.cashback_creditos') is null, true, 'tabelas do cashback antigo saíram');
select pg_temp.eq((select count(*) from configuracoes where chave like 'cashback_%'), 0::bigint, 'config do cashback antigo saiu');
select pg_temp.eq((select count(*) from pg_proc where proname = 'create_order_with_items'), 1::bigint, 'uma só create_order_with_items');

set role anon;
select pg_temp.eq((select ativo from clube_regras()), true, 'regras: clube no ar');
select pg_temp.eq((select nome from clube_regras()), 'Alpha Club', 'regras: nome');
select pg_temp.eq((select cupom_valores from clube_regras()), '{5,10}'::numeric[], 'regras: cupons de R$ 5 e R$ 10');
select pg_temp.eq((select valor_ponto from clube_regras()), 0.10::numeric, 'regras: 100 pontos = R$ 10');
select pg_temp.eq((select count(*) from clube_pontos), 0::bigint, 'anon não lê pontos (RLS)');

-- 1ª compra da Ana: 5 sedas (R$ 50) + 1 piteira em promoção (R$ 15), frete 30
select create_order_with_items('A1','Ana','(11) 99999-0001',null,null,'pix','delivery',null,65,95,
  '[{"produto_id":1,"produto_nome":"Seda","quantidade":5,"preco_unitario":10,"subtotal":50},
    {"produto_id":2,"produto_nome":"Piteira","quantidade":1,"preco_unitario":15,"subtotal":15}]'::jsonb,
  30, true, null, '(11) 98888-7777', '15/' || :mes_atual) as r \gset
select pg_temp.eq((:'r'::jsonb->>'pontos_usados')::int, 0, 'sem saldo, não usa pontos');
select pg_temp.eq((consultar_clube('11999990001')->>'participante')::boolean, false, 'antes de pagar ainda não é do clube');
reset role;
select pg_temp.eq((select nascimento_mes from clube_membros where whatsapp='11999990001')::int, :mes_atual, 'aniversário guardado antes da 1ª compra');

update pedidos set status='pago' where numero='A1';
select pg_temp.eq((select pontos from clube_pontos where origem='compra' and whatsapp='11999990001'), 65, 'R$ 1 = 1 ponto sobre os produtos (frete fora)');
select pg_temp.eq((select pontos from clube_pontos where origem='boas_vindas' and whatsapp='11999990001'), 50, 'bônus de boas-vindas na 1ª compra');
select pg_temp.eq((select pontos from clube_pontos where origem='aniversario' and whatsapp='11999990001'), 100, 'aniversário no mês: bônus já na 1ª compra');
select pg_temp.eq((select expira_em from clube_pontos where origem='compra' and whatsapp='11999990001'), ((((now() at time zone 'America/Sao_Paulo')::date + 366)::timestamp) at time zone 'America/Sao_Paulo'), 'cada lote vale 365 dias');
select pg_temp.eq(pg_temp.saldo('11999990001'), 215, 'saldo 65 + 50 + 100');
select pg_temp.eq((consultar_clube('5511999990001')->>'valor')::numeric, 21.50, '215 pontos = R$ 21,50');
select pg_temp.eq((select count(*) from clube_pontos where origem='aniversario'), 1::bigint, 'aniversário não repete no ano');
update pedidos set status='enviado' where numero='A1';
update pedidos set status='entregue' where numero='A1';
select pg_temp.eq(pg_temp.saldo('11999990001'), 215, 'enviado/entregue não geram de novo');

-- 2ª compra: 10 sedas (R$ 100, fora de promoção) + 2 piteiras (R$ 30, em promoção)
set role anon;
select create_order_with_items('A2','Ana','11999990001',null,null,'pix','delivery',null,130,130,
  '[{"produto_id":1,"produto_nome":"Seda","quantidade":10,"preco_unitario":10,"subtotal":100},
    {"produto_id":2,"produto_nome":"Piteira","quantidade":2,"preco_unitario":15,"subtotal":30}]'::jsonb,
  0, true, null, null, '01/' || :outro_mes) as r \gset
select pg_temp.eq((:'r'::jsonb->>'pontos_usados')::int, 100, 'usa até 10% só dos produtos fora de promoção');
select pg_temp.eq((:'r'::jsonb->>'total')::numeric, 120.00, 'total já sai com o desconto');
select pg_temp.eq(pg_temp.saldo('11999990001'), 115, 'saldo depois do uso');
reset role;
select pg_temp.eq((select nascimento_mes from clube_membros where whatsapp='11999990001')::int, :mes_atual, 'aniversário não é sobrescrito');

-- cupom da loja + pontos não somam
insert into cupons (codigo, tipo, valor) values ('LOJA10', 'pct', 10);
set role anon;
select create_order_with_items('A3','Ana','11999990001',null,null,'pix','delivery',null,50,45,
  '[{"produto_id":1,"produto_nome":"Seda","quantidade":5,"preco_unitario":10,"subtotal":50}]'::jsonb,
  0, true, 'loja10') as r \gset
select pg_temp.eq((:'r'::jsonb->>'pontos_usados')::int, 0, 'com cupom não usa pontos (não cumulativo)');
reset role;
select pg_temp.eq((select usos from cupons where codigo='LOJA10'), 1, 'cupom marcado como usado');
set role anon;
select create_order_with_items('A4','Ana','11999990001',null,null,'pix','delivery',null,50,45,'[]'::jsonb,0,false,'NAOEXISTE') as r \gset
select pg_temp.eq(:'r'::jsonb->>'code', 'CUPOM_INVALIDO', 'cupom inexistente recusa o pedido');
reset role;
select pg_temp.eq((select count(*) from pedidos where numero='A4'), 0::bigint, 'pedido com cupom inválido não é criado');

-- troca de pontos por cupom
set role anon;
select clube_resgatar_cupom('11999990001', 10) as r \gset
select pg_temp.eq((:'r'::jsonb->>'success')::boolean, true, 'troca 100 pontos por cupom de R$ 10');
select pg_temp.eq((:'r'::jsonb->>'valor_minimo')::numeric, 30.00, 'carrinho mínimo = 3× o cupom');
select pg_temp.eq((:'r'::jsonb->>'validade')::date, (now() at time zone 'America/Sao_Paulo')::date + 30, 'cupom vale 30 dias');
select :'r'::jsonb->>'codigo' as cod \gset
select pg_temp.eq(pg_temp.saldo('11999990001'), 15, 'pontos saíram do saldo');
select pg_temp.eq((clube_resgatar_cupom('11999990001', 5)->>'success')::boolean, false, 'sem pontos suficientes não troca');
select pg_temp.eq((clube_resgatar_cupom('11999990001', 7)->>'success')::boolean, false, 'valor fora da lista não troca');
select pg_temp.eq((select count(*) from validar_cupom(:'cod', 40, '11999990001')), 1::bigint, 'cupom do clube vale para o dono');
select pg_temp.eq((select count(*) from validar_cupom(:'cod', 40, '11977776666')), 0::bigint, 'cupom do clube não vale para outro WhatsApp');
select pg_temp.eq((select count(*) from validar_cupom(:'cod', 40)), 0::bigint, 'cupom do clube pede o WhatsApp');
select pg_temp.eq((select count(*) from validar_cupom(:'cod', 20, '11999990001')), 0::bigint, 'cupom do clube respeita o mínimo');
select pg_temp.eq((select count(*) from validar_cupom('LOJA10', 0)), 1::bigint, 'cupom da loja continua valendo sem WhatsApp');
select pg_temp.eq((select descricao from validar_cupom(:'cod', 40, '11999990001')), 'Alpha Club: R$ 10,00 de desconto', 'descrição do cupom do clube');
select pg_temp.eq((consultar_clube('11999990001')->'cupons'->0->>'codigo'), :'cod', 'cliente vê o cupom na consulta');
select pg_temp.eq((create_order_with_items('X1','Outro','11977776666',null,null,'pix','delivery',null,40,40,'[]'::jsonb,0,false,:'cod')->>'code'), 'CUPOM_INVALIDO', 'outro WhatsApp não usa o cupom no pedido');
select pg_temp.eq((create_order_with_items('A5','Ana','11999990001',null,null,'pix','delivery',null,40,30,'[]'::jsonb,0,false,:'cod')->>'success')::boolean, true, 'dono usa o cupom');
select pg_temp.eq((create_order_with_items('A6','Ana','11999990001',null,null,'pix','delivery',null,40,30,'[]'::jsonb,0,false,:'cod')->>'code'), 'CUPOM_INVALIDO', 'cupom do clube é de uso único');
reset role;
update pedidos set status='cancelado' where numero='A5';
select pg_temp.eq((select usos from cupons where codigo=:'cod'), 0, 'pedido cancelado devolve o cupom');

-- indique e ganhe: Bruno compra pela primeira vez indicado pela Ana
set role anon;
select create_order_with_items('B1','Bruno','11988887777',null,null,'pix','delivery',null,40,40,'[]'::jsonb,0,false,null,'11999990001') as r \gset
reset role;
update pedidos set status='pago' where numero='B1';
select pg_temp.eq((select pontos from clube_pontos where origem='indicacao' and whatsapp='11999990001'), 100, 'quem indicou ganha 100 pontos na 1ª compra do amigo');
select pg_temp.eq(pg_temp.saldo('11988887777'), 90, 'amigo ganha compra + boas-vindas');

-- Carla já era cliente (pedido pago antes do clube): indicação não conta
insert into pedidos (numero, cliente_nome, cliente_whatsapp, subtotal, total, frete, status) values ('C0','Carla','11966665555',10,10,0,'entregue');
set role anon;
select create_order_with_items('C1','Carla','11966665555',null,null,'pix','delivery',null,20,20,'[]'::jsonb,0,false,null,'11999990001') as r \gset
reset role;
update pedidos set status='pago' where numero='C1';
select pg_temp.eq((select count(*) from clube_pontos where origem='indicacao'), 1::bigint, 'cliente antigo não conta como indicação');
select pg_temp.eq((select count(*) from clube_pontos where origem='boas_vindas' and whatsapp='11966665555'), 1::bigint, 'cliente antigo ganha boas-vindas ao entrar no clube');

-- auto-indicação é ignorada
set role anon;
select create_order_with_items('D1','Davi','11955554444',null,null,'pix','delivery',null,20,20,'[]'::jsonb,0,false,null,'11955554444') as r \gset
reset role;
select pg_temp.eq((select indicado_por from pedidos where numero='D1'), null::text, 'auto-indicação ignorada');

-- cancelamentos
update pedidos set status='cancelado' where numero='B1';
select pg_temp.eq(pg_temp.saldo('11988887777'), 0, 'cancelou: pontos da compra e boas-vindas estornados');
select pg_temp.eq((select estornado from clube_pontos where origem='indicacao'), true, 'cancelou: bônus de indicação estornado');
select pg_temp.eq((select primeira_compra_em from clube_membros where whatsapp='11988887777'), null::timestamptz, 'cancelou: 1ª compra volta a contar');
update pedidos set status='pago' where numero='B1';
select pg_temp.eq(pg_temp.saldo('11988887777'), 90, 'pago de novo: pontos voltam');
select pg_temp.eq((select estornado from clube_pontos where origem='indicacao'), false, 'pago de novo: indicação volta');

select pg_temp.eq(pg_temp.saldo('11999990001'), 115, 'Ana antes de cancelar o pedido com pontos');
update pedidos set status='cancelado' where numero='A2';
select pg_temp.eq(pg_temp.saldo('11999990001'), 215, 'cancelou pedido que usou pontos: 100 voltam');

-- pedido antigo sem frete gravado
insert into pedidos (numero, cliente_nome, cliente_whatsapp, subtotal, total, frete, status) values ('E1','Eva','11944443333',20,49,0,'pendente');
update pedidos set status='pago' where numero='E1';
select pg_temp.eq((select pontos from clube_pontos where origem='compra' and whatsapp='11944443333'), 20, 'pedido antigo: base limitada ao subtotal');

-- insert anônimo já pago não gera pontos
insert into pedidos (numero, cliente_nome, cliente_whatsapp, subtotal, total, frete, status) values ('F1','Fraude','11933332222',1000,1000,0,'pago');
select pg_temp.eq(pg_temp.saldo('11933332222'), 0, 'insert já pago não gera pontos');

-- lote vencido não conta
update clube_pontos set expira_em = now() - interval '1 minute' where origem='indicacao';
select pg_temp.eq(pg_temp.saldo('11999990001'), 115, 'lote vencido sai do saldo');

-- clube fora do ar
update configuracoes set valor='false' where chave='clube_ativo';
select pg_temp.eq((select ativo from clube_regras()), false, 'desligado: regras avisam o site');
insert into pedidos (numero, cliente_nome, cliente_whatsapp, subtotal, total, frete, status) values ('G1','Gil','11922221111',100,100,0,'pendente');
update pedidos set status='pago' where numero='G1';
select pg_temp.eq(pg_temp.saldo('11922221111'), 0, 'desligado: compra não gera pontos');
select pg_temp.eq((create_order_with_items('A7','Ana','11999990001',null,null,'pix','delivery',null,100,100,'[{"produto_id":1,"produto_nome":"Seda","quantidade":10,"preco_unitario":10,"subtotal":100}]'::jsonb,0,true)->>'pontos_usados')::int, 0, 'desligado: não usa pontos');
select pg_temp.eq((clube_resgatar_cupom('11999990001', 5)->>'success')::boolean, false, 'desligado: não troca cupom');
select pg_temp.eq(pg_temp.saldo('11999990001'), 115, 'desligado: saldo fica guardado');
update configuracoes set valor='true' where chave='clube_ativo';

-- valores configuráveis
update configuracoes set valor='2' where chave='clube_pontos_por_real';
insert into pedidos (numero, cliente_nome, cliente_whatsapp, subtotal, total, frete, status) values ('H1','Hugo','11911110000',30,30,0,'pendente');
update pedidos set status='pago' where numero='H1';
select pg_temp.eq((select pontos from clube_pontos where origem='compra' and whatsapp='11911110000'), 60, 'pontos por real configurável');
update configuracoes set valor='1' where chave='clube_pontos_por_real';
update configuracoes set valor='5, 10, 20' where chave='clube_cupom_valores';
select pg_temp.eq((select cupom_valores from clube_regras()), '{5,10,20}'::numeric[], 'lista de cupons configurável');

-- retaguarda
do $$ begin
  perform clube_admin_ajustar('11999990001', 10, 'x');
  raise exception 'FAIL não-admin conseguiu ajustar';
exception when insufficient_privilege then raise notice 'ok  não-admin não ajusta pontos';
end $$;
set teste.admin = 'sim';
select pg_temp.eq((clube_admin_ajustar('11999990001', 40, 'cortesia')->>'saldo')::int, 155, 'admin credita pontos');
select pg_temp.eq((clube_admin_ajustar('11999990001', -155, 'fraude')->>'saldo')::int, 0, 'admin zera o saldo');
select pg_temp.eq((clube_admin_cliente('(11) 99999-0001')->>'pontos')::int, 0, 'admin consulta cliente');
select pg_temp.eq(jsonb_array_length(clube_admin_painel()->'aniversariantes') >= 1, true, 'painel lista aniversariantes do mês');
reset teste.admin;

-- chamada antiga (site já publicado) continua funcionando
set role anon;
select pg_temp.eq((create_order_with_items('Z1','Zé','11900000000',null,null,'pix','delivery',null,10,10)->>'success')::boolean, true, 'chamada sem os parâmetros novos funciona');
do $$ begin
  perform clube_saldo('11999990001');
  raise exception 'FAIL anon executou função interna';
exception when insufficient_privilege then raise notice 'ok  anon não chama funções internas';
end $$;
reset role;

-- erro no clube não trava a retaguarda
insert into pedidos (numero, cliente_nome, cliente_whatsapp, subtotal, total, frete, status) values ('I1','Iris','11900001111',100,100,0,'pendente');
alter table clube_pontos add constraint teste_quebra check (pontos < 0) not valid;
update pedidos set status='pago' where numero='I1';
select pg_temp.eq((select status from pedidos where numero='I1'), 'pago', 'status muda mesmo com o clube falhando');
alter table clube_pontos drop constraint teste_quebra;
