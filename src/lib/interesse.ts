import { supabase } from './supabase';

/** O que a pessoa demonstrou querer: o termo que buscou, a categoria ou
 *  subcategoria que abriu, ou o produto que olhou. Alimenta o painel de
 *  Performance ("o que estão procurando?") na retaguarda. */
export type TipoInteresse = 'busca' | 'categoria' | 'subcategoria' | 'produto';

interface Interesse {
  tipo: TipoInteresse;
  termo?: string | null;
  produto_id?: number | null;
  resultados?: number | null;
}

export interface GeoVisita {
  cidade: string | null;
  estado: string | null;
  cep: string | null;
}

const CHAVE_SESSAO = 'ag_sessao';
const CHAVE_GEO = 'ag_geo';
const CHAVE_VISTOS = 'ag_interesses';

function lerSessao(chave: string): string | null {
  try { return sessionStorage.getItem(chave); } catch { return null; }
}

function gravarSessao(chave: string, valor: string) {
  try { sessionStorage.setItem(chave, valor); } catch { /* aba anônima sem storage */ }
}

/** Identificador da aba, só para contar pessoas distintas no painel. */
function sessao(): string {
  let id = lerSessao(CHAVE_SESSAO);
  if (!id) {
    id = Math.random().toString(36).slice(2, 12) + Date.now().toString(36);
    gravarSessao(CHAVE_SESSAO, id);
  }
  return id;
}

/** A geolocalização é feita uma vez por visita (useVisita) e reaproveitada
 *  aqui, para não consultar o serviço de IP a cada busca. */
export function guardarGeo(geo: GeoVisita) {
  gravarSessao(CHAVE_GEO, JSON.stringify(geo));
}

function lerGeo(): GeoVisita {
  try {
    const g = JSON.parse(lerSessao(CHAVE_GEO) ?? 'null');
    if (g) return g;
  } catch { /* ignora */ }
  return { cidade: null, estado: null, cep: null };
}

/** Busca com resultado, avisada ao assistente do WhatsApp para oferecer
 *  ajuda e as ofertas daquele tipo de produto. */
export const EVENTO_BUSCOU = 'ag:buscou';

export function registrarInteresse(i: Interesse) {
  const termo = i.termo?.trim().slice(0, 80) || null;
  if (i.tipo !== 'produto' && (!termo || termo.length < 2)) return;
  if (i.tipo === 'produto' && !i.produto_id) return;

  if (i.tipo === 'busca' && termo && (i.resultados ?? 0) > 0) {
    window.dispatchEvent(new CustomEvent<string>(EVENTO_BUSCOU, { detail: termo }));
  }

  // A mesma coisa vista duas vezes na mesma visita conta uma só: voltar
  // para a categoria ou reabrir o produto não é interesse novo.
  const chave = `${i.tipo}:${i.produto_id ?? termo?.toLowerCase()}`;
  let vistos: string[] = [];
  try { vistos = JSON.parse(lerSessao(CHAVE_VISTOS) ?? '[]'); } catch { /* ignora */ }
  if (vistos.includes(chave)) return;
  gravarSessao(CHAVE_VISTOS, JSON.stringify([...vistos, chave].slice(-200)));

  const geo = lerGeo();
  void supabase.from('interesses_site').insert({
    sessao: sessao(),
    tipo: i.tipo,
    termo,
    produto_id: i.produto_id ?? null,
    resultados: i.resultados ?? null,
    cidade: geo.cidade?.slice(0, 80) ?? null,
    estado: geo.estado?.slice(0, 80) ?? null,
    cep: geo.cep?.slice(0, 12) ?? null,
  }).then(() => undefined, () => undefined);
}
