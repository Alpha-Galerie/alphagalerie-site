/** Busca disparada de fora da vitrine (a barra do topo da home, os atalhos
 *  de categoria). A vitrine escuta o evento, troca para "Todos" e busca. */
export const EVENTO_BUSCAR = 'ag:buscar';

export function buscarNaVitrine(termo: string) {
  const t = termo.trim();
  if (!t) return;
  window.dispatchEvent(new CustomEvent<string>(EVENTO_BUSCAR, { detail: t }));
  document.getElementById('produtos')?.scrollIntoView?.({ behavior: 'smooth' });
}
