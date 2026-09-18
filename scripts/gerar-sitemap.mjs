/**
 * Gera o sitemap.xml com todas as páginas de produto.
 *
 * O sitemap versionado listava só a home, então o Google não tinha como
 * descobrir as páginas de produto: elas só existem depois que o JavaScript
 * roda, e nada no site aponta para elas de forma rastreável. Quem busca
 * "seda", "piteira" ou "tabaco" não achava nenhuma página nossa porque, do
 * ponto de vista do buscador, o site tinha uma página só.
 *
 * Roda no build (prebuild). Sem credenciais, mantém o sitemap atual em vez
 * de quebrar a publicação.
 */
import { createClient } from '@supabase/supabase-js';
import { writeFileSync, readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import 'dotenv/config';

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SAIDA = resolve(RAIZ, 'public/sitemap.xml');
const SITE = process.env.VITE_SITE_URL || 'https://alphagalerie.com';

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;

function toSlug(nome) {
  return String(nome || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function escapar(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

async function main() {
  if (!url || !key) {
    console.warn('[sitemap] VITE_SUPABASE_URL/ANON_KEY ausentes — mantendo o sitemap atual.');
    if (!existsSync(SAIDA)) process.exitCode = 0;
    return;
  }

  const sb = createClient(url, key);
  const hoje = new Date().toISOString().slice(0, 10);
  const urls = [
    { loc: `${SITE}/`, changefreq: 'daily', priority: '1.0', lastmod: hoje },
  ];

  // Categorias viram links de vitrine filtrada, que já é uma rota válida.
  const { data: categorias, error: errCat } = await sb
    .from('categorias').select('id,nome,slug,ativo,oculto').order('ordem');
  if (errCat) console.warn('[sitemap] categorias:', errCat.message);
  (categorias || [])
    .filter((c) => c.ativo !== false && c.oculto !== true)
    .forEach((c) => {
      urls.push({ loc: `${SITE}/?cat=${c.id}`, changefreq: 'weekly', priority: '0.8', lastmod: hoje });
    });

  // Produtos: paginado por id (keyset). O PostgREST corta em 1000 linhas por
  // resposta, e paginar por offset/Range depende do servidor honrar o
  // cabeçalho — se ele ignorar, o laço nunca termina. Avançar pelo último id
  // se encerra sozinho, e o teto abaixo é uma trava de segurança.
  const passo = 1000;
  const TETO = 200;                      // no máximo 200 mil produtos
  const produtos = [];
  let ultimoId = 0;
  let falhou = false;

  for (let volta = 0; volta < TETO; volta++) {
    const { data, error } = await sb
      .from('produtos').select('id,nome,ativo,atualizado_em,criado_em')
      .gt('id', ultimoId).order('id', { ascending: true }).limit(passo);

    if (error) { console.warn('[sitemap] produtos:', error.message); falhou = true; break; }
    if (!data || data.length === 0) break;

    const maiorId = data[data.length - 1].id;
    if (maiorId <= ultimoId) {           // servidor não avançou: para em vez de girar
      console.warn('[sitemap] paginação não avançou, encerrando.');
      break;
    }
    produtos.push(...data);
    ultimoId = maiorId;
    if (data.length < passo) break;
  }

  // Uma falha de rede no build não pode substituir um sitemap completo por um
  // com uma única URL — o Google leria isso como "o site encolheu".
  if (falhou && produtos.length === 0 && existsSync(SAIDA)) {
    console.warn('[sitemap] consulta falhou — sitemap atual preservado.');
    return;
  }

  produtos
    .filter((p) => p.ativo !== false)
    .forEach((p) => {
      const slug = toSlug(p.nome);
      urls.push({
        loc: `${SITE}/produto/${p.id}${slug ? '-' + slug : ''}`,
        changefreq: 'weekly',
        priority: '0.7',
        lastmod: (p.atualizado_em || p.criado_em || hoje).slice(0, 10),
      });
    });

  const xml =
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    urls.map((u) =>
      '  <url>\n' +
      `    <loc>${escapar(u.loc)}</loc>\n` +
      `    <lastmod>${u.lastmod}</lastmod>\n` +
      `    <changefreq>${u.changefreq}</changefreq>\n` +
      `    <priority>${u.priority}</priority>\n` +
      '  </url>'
    ).join('\n') +
    '\n</urlset>\n';

  writeFileSync(SAIDA, xml, 'utf8');
  console.log(`[sitemap] ${urls.length} URLs (${produtos.filter(p => p.ativo !== false).length} produtos) em public/sitemap.xml`);
}

main().catch((e) => {
  console.warn('[sitemap] falhou, mantendo o arquivo atual:', e.message);
});
