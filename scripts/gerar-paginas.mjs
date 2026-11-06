/**
 * Gera, depois do build, o HTML já pronto da página /kit e de cada produto.
 *
 * O site é uma SPA: toda rota recebe o mesmo index.html, com o título e a
 * descrição da home, e só depois do JavaScript a página vira "produto X". O
 * Google até executa o JavaScript, mas o que vem na resposta pesa mais — e o
 * WhatsApp, o Instagram e o Facebook nem executam: a prévia do link de um kit
 * saía com o título e a imagem da home.
 *
 * Aqui cada página ganha uma cópia do index.html do build com o próprio
 * título, descrição, canonical, imagem de compartilhamento e JSON-LD. A Vercel
 * entrega o arquivo da pasta antes de cair no rewrite da SPA (como já acontece
 * com /itinerante), e o React assume a página normalmente.
 *
 * Roda no postbuild. Qualquer falha só registra aviso: o site continua
 * funcionando como SPA, então não vale derrubar a publicação por isso.
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import 'dotenv/config';
import { gerarPaginas } from './lib/paginas.mjs';

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = resolve(RAIZ, 'dist');
const BASE = resolve(DIST, 'index.html');
const SITE = (process.env.VITE_SITE_URL || 'https://www.alphagalerie.com').replace(/\/$/, '');

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;

function gravar(caminho, html) {
  const dir = resolve(DIST, `.${caminho}`);
  mkdirSync(dir, { recursive: true });
  writeFileSync(resolve(dir, 'index.html'), html, 'utf8');
}

/**
 * Busca os produtos ativos em partes leves. A coluna imagem_url de alguns
 * produtos guarda a foto inteira em base64 (dezenas de MB no total): pedir
 * essa coluna para todos estourava o tempo do banco. Por isso a foto vem numa
 * consulta separada, só das que são endereço (http...); as embutidas usam a
 * imagem padrão na prévia.
 */
async function buscarProdutos(sb) {
  const cols = 'id,nome,marca,descricao,preco,preco_pix,preco_promocional,estoque,subcategoria,ativo,destaque_ordem,categoria_id';
  const todos = [];
  let ultimoId = 0;
  for (let volta = 0; volta < 400; volta++) {
    const { data, error } = await sb.from('produtos').select(cols)
      .eq('ativo', true).gt('id', ultimoId).order('id', { ascending: true }).limit(500);
    if (error) throw new Error(`produtos: ${error.message}`);
    if (!data || data.length === 0) break;
    const maior = data[data.length - 1].id;
    if (maior <= ultimoId) break;
    todos.push(...data);
    ultimoId = maior;
    if (data.length < 500) break;
  }

  // Fotos dos kits primeiro: poucas linhas, filtradas pela subcategoria, e
  // são as páginas que mais importam.
  const fotos = new Map();
  const { data: fotosKits, error: errKits } = await sb.from('produtos')
    .select('id,imagem_url').eq('ativo', true).eq('subcategoria', 'Kits Exclusivos');
  if (errKits) console.warn('[paginas] fotos dos kits:', errKits.message);
  (fotosKits || []).forEach((r) => {
    if (typeof r.imagem_url === 'string' && r.imagem_url.startsWith('http')) fotos.set(r.id, r.imagem_url);
  });

  // Demais fotos em grupos de 8 produtos, pelo id. O filtro "começa com
  // http" precisa abrir as fotos embutidas do grupo, e elas se concentram em
  // alguns trechos do catálogo: um lote grande ali estoura o tempo do banco.
  // Grupo que falhar duas vezes fica sem foto (imagem padrão) e a busca segue.
  const ids = todos.map((p) => p.id).filter((id) => !fotos.has(id));
  let gruposSemFoto = 0;
  for (let i = 0; i < ids.length; i += 8) {
    const grupo = ids.slice(i, i + 8);
    let data = null;
    for (let tentativa = 0; tentativa < 2 && !data; tentativa++) {
      const r = await sb.from('produtos').select('id,imagem_url')
        .in('id', grupo).like('imagem_url', 'http%');
      if (!r.error) data = r.data || [];
    }
    if (!data) { gruposSemFoto++; continue; }
    data.forEach((r) => fotos.set(r.id, r.imagem_url));
  }
  if (gruposSemFoto > 0) console.warn(`[paginas] ${gruposSemFoto} grupo(s) de fotos não responderam — usam a imagem padrão.`);

  const { data: cats } = await sb.from('categorias').select('id,nome');
  const nomeCat = new Map((cats || []).map((c) => [c.id, c.nome]));

  return todos.map((p) => ({
    ...p,
    imagem_url: fotos.get(p.id) ?? null,
    categorias: nomeCat.has(p.categoria_id) ? { nome: nomeCat.get(p.categoria_id) } : null,
  }));
}

async function main() {
  if (!existsSync(BASE)) { console.warn('[paginas] dist/index.html não existe — nada a gerar.'); return; }
  if (!url || !key) { console.warn('[paginas] VITE_SUPABASE_URL/ANON_KEY ausentes — páginas não geradas.'); return; }

  const base = readFileSync(BASE, 'utf8');
  const produtos = await buscarProdutos(createClient(url, key));

  const arquivos = gerarPaginas({ base, produtos, SITE });
  for (const [caminho, html] of arquivos) gravar(caminho, html);

  console.log(`[paginas] /kit e ${produtos.length} páginas de produto com HTML próprio.`);
}

main().catch((e) => {
  console.warn('[paginas] falhou, o site segue como SPA:', e?.message || e);
});
