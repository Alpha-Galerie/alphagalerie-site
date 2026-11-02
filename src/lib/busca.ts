/** Busca disparada de fora da vitrine (a barra do topo da home, os atalhos
 *  de categoria). A vitrine escuta o evento, troca para "Todos" e busca. */
export const EVENTO_BUSCAR = 'ag:buscar';

export function buscarNaVitrine(termo: string) {
  const t = termo.trim();
  if (!t) return;
  window.dispatchEvent(new CustomEvent<string>(EVENTO_BUSCAR, { detail: t }));
  document.getElementById('produtos')?.scrollIntoView?.({ behavior: 'smooth' });
}

/** Mesma regra de `normalizar_busca` no banco: minúsculas, sem acento e com
 *  espaços simples. A vitrine procura em `produtos.busca_texto`, que já vem
 *  assim, então "carvão" acha a subcategoria "Carvao". */
export function normalizarBusca(termo: string): string {
  return termo
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/** Palavras do termo, cada uma pronta para um `ilike '%…%'`: sem acento e com
 *  os curingas do `like` (% e _) escapados. */
export function palavrasBusca(termo: string): string[] {
  return normalizarBusca(termo)
    .split(' ')
    .filter(Boolean)
    .map((p) => p.replace(/[\\%_]/g, (ch) => '\\' + ch));
}
