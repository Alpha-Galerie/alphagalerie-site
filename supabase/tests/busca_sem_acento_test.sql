-- Testes da busca sem acento (migração 20261102000000_busca_sem_acento.sql).
--
--   createdb busca_test
--   psql -d busca_test -v ON_ERROR_STOP=1 -f supabase/tests/busca_sem_acento_test.sql
--
-- Cada verificação imprime "ok  <descrição>"; a primeira falha aborta.

-- ── fixture ──────────────────────────────────────────────────────────────
create table categorias (id bigserial primary key, nome text);
create table produtos (id bigserial primary key, nome text, marca text, subcategoria text, categoria_id bigint, ativo boolean default true, atualizado_em timestamptz);
insert into categorias (id, nome) values (3, 'Arguile'), (1, 'Headshop');
insert into produtos (id, nome, marca, subcategoria, categoria_id, atualizado_em) values
  (12, 'KANARA 1KG', 'kanara', 'Carvao', 3, '2026-01-01'),
  (383, 'BRO - 1KG', 'BRO', 'Carvao', 3, '2026-01-01'),
  (53, 'BATEDOR CARVÃO', 'ATR', 'Acessorios', 3, '2026-01-01'),
  (35, 'BALANÇA  DIGITAL', null, 'Headshop', 1, '2026-01-01'),
  (40, 'ADALYA - OH MY BLUE', 'Adalya', 'Essencias', 3, '2026-01-01');

\ir ../migrations/20261102000000_busca_sem_acento.sql

-- ── cenários ─────────────────────────────────────────────────────────────
\set ON_ERROR_STOP 1
create or replace function pg_temp.eq(got anyelement, want anyelement, msg text) returns void language plpgsql as $$
begin if got is distinct from want then raise exception 'FAIL %: got % want %', msg, got, want; end if; raise notice 'ok  %', msg; end $$;
-- o que o site faz: cada palavra do termo normalizado precisa estar em busca_texto
create or replace function pg_temp.busca(termo text) returns text language sql as $$
  select string_agg(id::text, ',' order by id) from produtos p
   where ativo and (select bool_and(p.busca_texto like '%' || w || '%')
                      from unnest(string_to_array(normalizar_busca(termo), ' ')) w)
$$;

select pg_temp.eq(normalizar_busca('  Carvão   de COCO '), 'carvao de coco', 'normaliza acento, caixa e espaços');
select pg_temp.eq(pg_temp.busca('carvão'), '12,53,383', 'carvão acha os carvões da subcategoria Carvao e o batedor');
select pg_temp.eq(pg_temp.busca('carvao'), '12,53,383', 'carvao sem acento acha o mesmo');
select pg_temp.eq(pg_temp.busca('essência'), '40', 'essência acha Essencias');
select pg_temp.eq(pg_temp.busca('balança'), '35', 'balança acha BALANÇA com espaço duplo');
select pg_temp.eq(pg_temp.busca('carvão kanara'), '12', 'duas palavras: precisa das duas');
select pg_temp.eq(pg_temp.busca('arguile bro'), '383', 'categoria entra na busca');
select pg_temp.eq((select atualizado_em from produtos where id = 12), '2026-01-01'::timestamptz, 'preencher não mexe em atualizado_em');

-- trigger mantém em dia
insert into produtos (id, nome, marca, subcategoria, categoria_id) values (900, 'COCO NARA 500G', null, 'Carvão', 3);
select pg_temp.eq(pg_temp.busca('carvao'), '12,53,383,900', 'produto novo entra na busca');
update produtos set subcategoria = 'Acessorios' where id = 900;
select pg_temp.eq(pg_temp.busca('carvao'), '12,53,383', 'edição atualiza a busca');

\echo 'todos os testes da busca sem acento passaram'
