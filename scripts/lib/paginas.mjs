/**
 * Montagem do HTML pronto de cada página (usado por scripts/gerar-paginas.mjs).
 * Funções puras: recebem o index.html do build e os produtos, e devolvem os
 * arquivos a gravar. Mesmas regras de src/lib/productPath.ts, src/lib/kits.ts
 * e src/lib/seo.ts.
 */
const KITS = 'Kits Exclusivos';

export function toSlug(nome) {
  return String(nome || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export function caminhoProduto(p) {
  const slug = toSlug(p.nome);
  return slug ? `/produto/${p.id}-${slug}` : `/produto/${p.id}`;
}

const escAttr = (v) => String(v).replace(/&/g, '&amp;').replace(/"/g, '&quot;')
  .replace(/</g, '&lt;').replace(/>/g, '&gt;');
const escTexto = (v) => String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function resumir(texto) {
  const limpo = String(texto || '').replace(/\s+/g, ' ').trim();
  return limpo.length <= 160 ? limpo : `${limpo.slice(0, 157)}...`;
}

function absoluta(u, SITE) {
  // Foto embutida (data:) não serve de prévia: usa a imagem padrão.
  if (!u || u.startsWith('data:')) return `${SITE}/og-default.jpg`;
  if (/^https?:\/\//.test(u)) return u;
  return `${SITE}${u.startsWith('/') ? '' : '/'}${u}`;
}

function itensDoKit(p) {
  if (p.subcategoria !== KITS || !p.descricao) return [];
  const linhas = p.descricao.split('\n').map((l) => l.trim())
    .filter((l) => l.startsWith('•')).map((l) => l.replace(/^•\s*/, '')).filter(Boolean);
  if (linhas.length > 0) return linhas;
  const vem = p.descricao.match(/Vem no kit:\s*(.+?)\.(\s|$)/);
  if (!vem) return [];
  return vem[1].split(' + ').map((i) => i.trim()).filter(Boolean)
    .map((i) => i.charAt(0).toUpperCase() + i.slice(1));
}

const ehKitCase = (p) => /\bCASE\b/i.test(p.nome);

function nomeEmTitulo(nome) {
  return String(nome).trim().toLowerCase()
    .replace(/(^|[\s-])(\p{L})/gu, (_m, sep, letra) => sep + letra.toUpperCase());
}

export function seoDoKit(p) {
  const itens = itensDoKit(p);
  const texto = itens.join(' ').toLowerCase();
  const tipo = ehKitCase(p)
    ? 'kit com case, tabaco e acessórios'
    : texto.includes('tabaco')
      ? 'kit com tabaco, seda e piteira'
      : /isqueiro|bic/.test(texto)
        ? 'kit de seda, piteira e isqueiro'
        : 'kit de seda e piteira';
  const lista = itens.length > 1 ? `${itens.slice(0, -1).join(', ')} e ${itens[itens.length - 1]}` : (itens[0] ?? '');
  return {
    titulo: `${nomeEmTitulo(p.nome)} — ${tipo} | Alpha Galerie`,
    descricao: lista
      ? `Kit exclusivo Alpha Galerie: ${lista}. ${ehKitCase(p) ? 'No case rígido Alpha' : 'Na embalagem exclusiva'}, só no site. Compre online e receba em casa.`
      : `${nomeEmTitulo(p.nome)}: kit exclusivo Alpha Galerie, só no site. Compre online e receba em casa.`,
  };
}

function precoVigente(p) {
  const cheio = Number(p.preco ?? 0);
  const promo = p.preco_promocional != null ? Number(p.preco_promocional) : null;
  return promo != null && promo > 0 && promo < cheio ? promo : cheio;
}

const moeda = (v) => `R$ ${Number(v).toFixed(2).replace('.', ',').replace(',00', '')}`;

// ── montagem do HTML ──

function trocarMeta(html, attr, nome, valor) {
  const re = new RegExp(`(<meta\\s+${attr}="${nome.replace(/[.:]/g, '\\$&')}"\\s+content=")[^"]*(")`);
  if (re.test(html)) return html.replace(re, `$1${escAttr(valor)}$2`);
  return html.replace('</head>', `  <meta ${attr}="${nome}" content="${escAttr(valor)}" />\n</head>`);
}

export function montar(base, { titulo, descricao, url: pagina, imagem, tipo, jsonLdId, jsonLd }) {
  let html = base.replace(/<title>[^<]*<\/title>/, `<title>${escTexto(titulo)}</title>`);
  html = html.replace(/\s*<link rel="canonical"[^>]*>/g, '');
  html = trocarMeta(html, 'name', 'description', descricao);
  html = trocarMeta(html, 'property', 'og:type', tipo);
  html = trocarMeta(html, 'property', 'og:title', titulo);
  html = trocarMeta(html, 'property', 'og:description', descricao);
  html = trocarMeta(html, 'property', 'og:image', imagem);
  html = trocarMeta(html, 'property', 'og:url', pagina);
  html = trocarMeta(html, 'name', 'twitter:card', 'summary_large_image');
  html = trocarMeta(html, 'name', 'twitter:title', titulo);
  html = trocarMeta(html, 'name', 'twitter:description', descricao);
  html = trocarMeta(html, 'name', 'twitter:image', imagem);
  const ld = jsonLd
    ? `  <script type="application/ld+json" id="${jsonLdId}">${JSON.stringify(jsonLd).replace(/</g, '\\u003c')}</script>\n`
    : '';
  return html.replace('</head>', `  <link rel="canonical" href="${escAttr(pagina)}" />\n${ld}</head>`);
}

/**
 * Devolve [caminho, html] de cada página: um por produto ativo e a /kit.
 */
export function gerarPaginas({ base, produtos, SITE }) {
  const arquivos = [];
  // Produtos
  for (const p of produtos) {
    const pagina = `${SITE}${caminhoProduto(p)}`;
    const imagem = absoluta(p.imagem_url, SITE);
    const kit = p.subcategoria === KITS ? seoDoKit(p) : null;
    const titulo = kit?.titulo ?? `${p.nome} | ALPHA GALERIE`;
    const descricao = resumir(kit?.descricao ?? (p.descricao && p.descricao.trim()
      ? p.descricao
      : `${p.nome} ${p.marca ? `da ${p.marca}` : ''} na Alpha Galerie.`));
    arquivos.push([caminhoProduto(p), montar(base, {
      titulo, descricao, url: pagina, imagem, tipo: 'product', jsonLdId: 'ld-produto',
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: p.nome,
        description: descricao,
        image: imagem,
        sku: String(p.id),
        ...(p.marca ? { brand: { '@type': 'Brand', name: p.marca } } : {}),
        ...(p.categorias?.nome ? { category: p.categorias.nome } : {}),
        offers: {
          '@type': 'Offer',
          url: pagina,
          priceCurrency: 'BRL',
          price: precoVigente(p).toFixed(2),
          availability: (p.estoque ?? 0) > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
          seller: { '@type': 'Store', name: 'Alpha Galerie', '@id': `${SITE}/#loja` },
        },
      },
    })]);
  }

  // /kit
  const kits = produtos.filter((p) => p.subcategoria === KITS)
    .sort((a, b) => (a.destaque_ordem ?? 0) - (b.destaque_ordem ?? 0) || a.id - b.id);
  const disponiveis = kits.filter((k) => !ehKitCase(k) && (k.estoque ?? 0) > 0);
  const menor = disponiveis.length
    ? Math.min(...disponiveis.map((k) => Number(k.preco_pix ?? k.preco)))
    : null;
  const descricaoKits = `Kits Alpha exclusivos${menor ? ` a partir de ${moeda(menor)}` : ''}: seda, piteira, isqueiro e tabaco na embalagem exclusiva Alpha Galerie. Só no site. Compre online e receba em casa.`;
  arquivos.push(['/kit', montar(base, {
    titulo: 'Kits de seda, piteira e isqueiro exclusivos | Alpha Galerie',
    descricao: resumir(descricaoKits),
    url: `${SITE}/kit`,
    imagem: `${SITE}/og-kits.jpg`,
    tipo: 'website',
    jsonLdId: 'ld-kits',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: 'Kits Alpha',
      itemListElement: kits.map((k, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        url: `${SITE}${caminhoProduto(k)}`,
        name: k.nome,
      })),
    },
  })]);

  return arquivos;
}
