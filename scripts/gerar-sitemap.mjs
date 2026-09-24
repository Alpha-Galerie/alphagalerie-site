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


/**
 * Aplica no index.html os textos de SEO que o dono edita na retaguarda.
 *
 * Roda no build e grava direto no HTML. Injetar por JavaScript depois que a
 * página carrega é menos confiável para o buscador — o que pesa é o que já
 * vem no HTML da resposta.
 *
 * Se a consulta falhar, o HTML fica como está: é melhor publicar com o texto
 * anterior do que sem título e sem descrição.
 */
async function aplicarTextosSeo(sb) {
  const HTML = resolve(RAIZ, 'index.html');
  const { data, error } = await sb
    .from('configuracoes').select('chave,valor')
    .in('chave', ['seo_titulo', 'seo_descricao', 'seo_palavras', 'seo_frase_loja']);

  if (error) { console.warn('[seo] configurações:', error.message, '— HTML mantido.'); return; }
  if (!data || data.length === 0) { console.warn('[seo] nada configurado — HTML mantido.'); return; }

  const cfg = Object.fromEntries(data.map((r) => [r.chave, (r.valor || '').trim()]));
  let html = readFileSync(HTML, 'utf8');

  const escAttr = (v) => String(v).replace(/&/g, '&amp;').replace(/"/g, '&quot;')
    .replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const escTexto = (v) => String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const trocarMeta = (attr, nome, valor) => {
    if (!valor) return;
    const re = new RegExp(`(<meta\\s+${attr}="${nome}"\\s+content=")[^"]*(")`);
    if (re.test(html)) html = html.replace(re, `$1${escAttr(valor)}$2`);
    else console.warn(`[seo] meta ${nome} não encontrada no HTML.`);
  };

  if (cfg.seo_titulo) {
    html = html.replace(/<title>[^<]*<\/title>/, `<title>${escTexto(cfg.seo_titulo)}</title>`);
    trocarMeta('property', 'og:title', cfg.seo_titulo);
  }
  if (cfg.seo_descricao) {
    trocarMeta('name', 'description', cfg.seo_descricao);
    trocarMeta('property', 'og:description', cfg.seo_frase_loja || cfg.seo_descricao);
  }
  trocarMeta('name', 'keywords', cfg.seo_palavras);

  writeFileSync(HTML, html, 'utf8');
  console.log('[seo] título e descrição aplicados a partir da retaguarda.');
}

/**
 * Reescreve o schema JSON-LD da loja com o endereço, telefone e horário que
 * o dono edita na retaguarda.
 *
 * É esse bloco que o Google lê para saber onde a loja fica. Ele estava
 * escrito à mão no HTML, então divergir do rodapé (ou do perfil do Google)
 * era só questão de tempo — e endereço divergente derruba a busca local.
 *
 * O bloco é reescrito por JSON.parse/stringify, não por substituição de
 * texto: mexer em JSON com expressão regular quebra no primeiro acento ou
 * vírgula fora do lugar.
 */
async function aplicarDadosDaLoja(sb) {
  const HTML = resolve(RAIZ, 'index.html');
  const chaves = [
    'loja_endereco', 'loja_complemento', 'loja_bairro', 'loja_cidade', 'loja_uf',
    'loja_cep', 'loja_telefone', 'loja_instagram',
    'loja_hora_semana_abre', 'loja_hora_semana_fecha',
    'loja_hora_domingo_abre', 'loja_hora_domingo_fecha',
  ];

  const { data, error } = await sb.from('configuracoes').select('chave,valor').in('chave', chaves);
  if (error) { console.warn('[loja] configurações:', error.message, '— schema mantido.'); return; }
  if (!data || data.length === 0) { console.warn('[loja] nada configurado — schema mantido.'); return; }

  const cfg = Object.fromEntries(data.map((r) => [r.chave, String(r.valor ?? '').trim()]));
  let html = readFileSync(HTML, 'utf8');

  // Acha o bloco ld+json que descreve a loja, sem depender da ordem deles.
  const blocos = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  const alvo = blocos.find((m) => m[1].includes('"@type": "Store"') || m[1].includes('"@type":"Store"'));
  if (!alvo) { console.warn('[loja] bloco Store não encontrado — schema mantido.'); return; }

  let loja;
  try {
    loja = JSON.parse(alvo[1]);
  } catch (e) {
    console.warn('[loja] schema atual não é JSON válido:', e.message, '— mantido.');
    return;
  }

  if (!loja.address || typeof loja.address !== 'object') {
    loja.address = { '@type': 'PostalAddress', addressCountry: 'BR' };
  }

  const rua = [cfg.loja_endereco, cfg.loja_complemento].filter(Boolean).join(' — ');
  if (rua) loja.address.streetAddress = rua;
  if (cfg.loja_cidade) loja.address.addressLocality = cfg.loja_cidade;
  if (cfg.loja_uf) loja.address.addressRegion = cfg.loja_uf;
  if (cfg.loja_cep) loja.address.postalCode = cfg.loja_cep;

  // O schema exige E.164; o dono digita "(11) 94292-0076".
  const digitos = (cfg.loja_telefone || '').replace(/\D/g, '');
  if (digitos) loja.telephone = digitos.startsWith('55') ? `+${digitos}` : `+55${digitos}`;

  if (cfg.loja_instagram) {
    loja.sameAs = [`https://www.instagram.com/${cfg.loja_instagram.replace(/^@/, '')}`];
  }

  const busca = ['Alpha Galerie', cfg.loja_endereco, cfg.loja_bairro, cfg.loja_cidade, cfg.loja_uf, cfg.loja_cep]
    .filter(Boolean).join(', ');
  if (busca) loja.hasMap = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(busca)}`;

  // Horário vazio quer dizer fechado, e dia fechado simplesmente não entra —
  // declarar "opens" sem "closes" produz schema inválido.
  const faixa = (dias, abre, fecha) =>
    /^\d{1,2}:\d{2}$/.test(abre || '') && /^\d{1,2}:\d{2}$/.test(fecha || '')
      ? [{ '@type': 'OpeningHoursSpecification', dayOfWeek: dias, opens: abre, closes: fecha }]
      : [];

  const horarios = [
    ...faixa(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
      cfg.loja_hora_semana_abre, cfg.loja_hora_semana_fecha),
    ...faixa('Sunday', cfg.loja_hora_domingo_abre, cfg.loja_hora_domingo_fecha),
  ];
  // Sem nenhum horário válido, é melhor manter o que já estava do que publicar
  // uma loja que, para o Google, não abre nunca.
  if (horarios.length > 0) loja.openingHoursSpecification = horarios;

  // "</script>" dentro de um valor encerraria a tag antes da hora. Escapar o
  // "<" resolve e o JSON continua equivalente.
  const serializado = JSON.stringify(loja, null, 2).replace(/</g, '\\u003c');
  html = html.slice(0, alvo.index) +
    `<script type="application/ld+json">\n${serializado}\n  </script>` +
    html.slice(alvo.index + alvo[0].length);

  writeFileSync(HTML, html, 'utf8');
  console.log('[loja] endereço, telefone e horário aplicados a partir da retaguarda.');
}

async function main() {
  if (!url || !key) {
    console.warn('[sitemap] VITE_SUPABASE_URL/ANON_KEY ausentes — mantendo o sitemap atual.');
    if (!existsSync(SAIDA)) process.exitCode = 0;
    return;
  }

  const sb = createClient(url, key);
  await aplicarTextosSeo(sb);
  await aplicarDadosDaLoja(sb);
  const hoje = new Date().toISOString().slice(0, 10);
  const urls = [
    { loc: `${SITE}/`, changefreq: 'daily', priority: '1.0', lastmod: hoje },
    { loc: `${SITE}/alpha-club`, changefreq: 'monthly', priority: '0.5', lastmod: hoje },
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
