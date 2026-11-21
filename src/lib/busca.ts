/** Busca disparada de fora da vitrine (a barra do topo da home, os atalhos
 *  de categoria). A vitrine escuta o evento, troca para "Todos" e busca. */
export const EVENTO_BUSCAR = 'ag:buscar';

export function buscarNaVitrine(termo: string) {
  const t = termo.trim();
  if (!t) return;
  window.dispatchEvent(new CustomEvent<string>(EVENTO_BUSCAR, { detail: t }));
  document.getElementById('produtos')?.scrollIntoView?.({ behavior: 'smooth' });
}

/** O que a vitrine está mostrando. */
export interface FiltroVitrine {
  categoriaSlug: string | null;
  subcategoria: string | null;
  busca?: string;
}

/** Parâmetros do endereço para a vitrine escolhida, mantendo os outros
 *  (?p= do produto aberto, utm_*). Com isso o link copiado do navegador
 *  abre no mesmo lugar: /?cat=narguile&sub=Essencias. */
export function paramsDaVitrine(atual: URLSearchParams, filtro: FiltroVitrine): URLSearchParams {
  const next = new URLSearchParams(atual);
  if (filtro.categoriaSlug) next.set('cat', filtro.categoriaSlug);
  else next.delete('cat');
  if (filtro.categoriaSlug && filtro.subcategoria) next.set('sub', filtro.subcategoria);
  else next.delete('sub');
  if (filtro.busca) next.set('q', filtro.busca);
  else next.delete('q');
  return next;
}
