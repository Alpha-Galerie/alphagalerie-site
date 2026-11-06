/**
 * Metadados de SEO e de compartilhamento das páginas do site.
 *
 * O domínio principal é o www: alphagalerie.com redireciona para
 * www.alphagalerie.com, então canonical, og:url e JSON-LD apontam sempre para
 * o www — apontar para um endereço que redireciona é sinal confuso para o
 * Google e quebra a prévia do link no WhatsApp.
 *
 * As páginas de produto e a /kit também saem prontas no HTML do build
 * (scripts/gerar-paginas.mjs). Aqui elas são mantidas iguais depois que o
 * JavaScript carrega, e voltam ao padrão quando a pessoa navega para outra
 * página.
 */
export const SITE_URL = 'https://www.alphagalerie.com';
export const OG_IMAGEM_PADRAO = `${SITE_URL}/og-default.jpg`;
export const OG_IMAGEM_KITS = `${SITE_URL}/og-kits.jpg`;

export const SEO_PADRAO = {
  titulo: 'ALPHA GALERIE — Headshop, Charutaria, Arguile · Alphaville',
  descricao: 'Mais de 10 anos sendo a referencia em headshop, charutaria, arguile e lifestyle em Alphaville.',
  ogTitulo: 'ALPHA GALERIE — Alphaville',
  ogDescricao: 'Headshop · Charutaria · Arguile · Lifestyle · Alphaville/Barueri',
};

export function upsertMeta(attr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

/** Define o canonical da página; `null` remove (a home não declara um). */
export function definirCanonical(href: string | null) {
  let el = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (href === null) {
    el?.remove();
    return;
  }
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', 'canonical');
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

/** Publica (ou remove, com `null`) um bloco JSON-LD identificado por `id`. */
export function definirJsonLd(id: string, dados: Record<string, unknown> | null) {
  document.getElementById(id)?.remove();
  if (!dados) return;
  const el = document.createElement('script');
  el.id = id;
  el.type = 'application/ld+json';
  el.textContent = JSON.stringify(dados);
  document.head.appendChild(el);
}

export function aplicarSeo(p: {
  titulo: string;
  descricao: string;
  url: string;
  imagem: string;
  tipo: 'website' | 'product';
}) {
  document.title = p.titulo;
  definirCanonical(p.url);
  upsertMeta('name', 'description', p.descricao);
  upsertMeta('property', 'og:type', p.tipo);
  upsertMeta('property', 'og:title', p.titulo);
  upsertMeta('property', 'og:description', p.descricao);
  upsertMeta('property', 'og:image', p.imagem);
  upsertMeta('property', 'og:url', p.url);
  upsertMeta('name', 'twitter:card', 'summary_large_image');
  upsertMeta('name', 'twitter:title', p.titulo);
  upsertMeta('name', 'twitter:description', p.descricao);
  upsertMeta('name', 'twitter:image', p.imagem);
}

export function restaurarSeoPadrao() {
  document.title = SEO_PADRAO.titulo;
  definirCanonical(null);
  upsertMeta('name', 'description', SEO_PADRAO.descricao);
  upsertMeta('property', 'og:type', 'website');
  upsertMeta('property', 'og:title', SEO_PADRAO.ogTitulo);
  upsertMeta('property', 'og:description', SEO_PADRAO.ogDescricao);
  upsertMeta('property', 'og:image', OG_IMAGEM_PADRAO);
  upsertMeta('property', 'og:url', `${SITE_URL}/`);
  upsertMeta('name', 'twitter:card', 'summary_large_image');
  upsertMeta('name', 'twitter:title', SEO_PADRAO.ogTitulo);
  upsertMeta('name', 'twitter:description', SEO_PADRAO.ogDescricao);
  upsertMeta('name', 'twitter:image', OG_IMAGEM_PADRAO);
}

export function resumirDescricao(texto: string): string {
  const limpo = texto.replace(/\s+/g, ' ').trim();
  return limpo.length <= 160 ? limpo : `${limpo.slice(0, 157)}...`;
}
