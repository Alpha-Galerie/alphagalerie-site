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

async function buscarProdutos(sb) {
  const cols = 'id,nome,marca,descricao,preco,preco_pix,preco_promocional,imagem_url,estoque,subcategoria,ativo,destaque_ordem,categorias!produtos_categoria_id_fkey(nome)';
  const todos = [];
  let ultimoId = 0;
  for (let volta = 0; volta < 200; volta++) {
    const { data, error } = await sb.from('produtos').select(cols)
      .eq('ativo', true).gt('id', ultimoId).order('id', { ascending: true }).limit(1000);
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) break;
    const maior = data[data.length - 1].id;
    if (maior <= ultimoId) break;
    todos.push(...data);
    ultimoId = maior;
    if (data.length < 1000) break;
  }
  return todos;
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
