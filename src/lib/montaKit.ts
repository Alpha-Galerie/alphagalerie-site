import { itensDoKit } from './kits';

/**
 * Assistente "Monte seu kit": o cliente diz até quanto quer gastar e o que
 * não pode faltar, e recebe até 3 kits exclusivos em degraus de preço (o mais
 * em conta, um intermediário e o mais completo que cabe no orçamento), mais
 * uma sugestão logo acima do orçamento para quem topar subir um pouco.
 */
export type ItemDesejado = 'seda' | 'piteira' | 'isqueiro' | 'tabaco' | 'tesoura' | 'dichavador' | 'case';

export const ITENS_DESEJADOS: { id: ItemDesejado; rotulo: string }[] = [
  { id: 'seda', rotulo: 'Seda' },
  { id: 'piteira', rotulo: 'Piteira' },
  { id: 'isqueiro', rotulo: 'Isqueiro' },
  { id: 'tabaco', rotulo: 'Tabaco' },
  { id: 'tesoura', rotulo: 'Tesoura' },
  { id: 'dichavador', rotulo: 'Dichavador' },
  { id: 'case', rotulo: 'Case' },
];

export const ORCAMENTOS = [20, 35, 70, 120, 200, 300];

/** Quanto o sugerido pode passar do orçamento ("por mais R$ X, leva..."). */
const FOLGA_ACIMA = 0.4;

const PADROES: Record<ItemDesejado, RegExp> = {
  seda: /\bsedas?\b/i,
  piteira: /\bpiteiras?\b/i,
  isqueiro: /\bisqueiros?\b/i,
  tabaco: /\btabacos?\b/i,
  tesoura: /\btesouras?\b/i,
  dichavador: /\b(dichavador|triturador|grinder)\b/i,
  case: /\bcase\b/i,
};

export interface KitBase {
  id: number;
  nome: string;
  subcategoria?: string | null;
  descricao?: string | null;
  preco: number;
  preco_pix?: number | null;
  estoque?: number | null;
}

/** O preço que o card mostra: Pix quando houver. */
export function precoDoKit(kit: Pick<KitBase, 'preco' | 'preco_pix'>): number {
  const pix = Number(kit.preco_pix);
  return Number.isFinite(pix) && pix > 0 ? pix : Number(kit.preco);
}

/** Que tipos de item o kit traz, lendo a lista da descrição. */
export function tiposDoKit(kit: KitBase): Set<ItemDesejado> {
  const texto = itensDoKit(kit).join(' | ');
  const tipos = new Set<ItemDesejado>();
  for (const [tipo, re] of Object.entries(PADROES) as [ItemDesejado, RegExp][]) {
    if (re.test(texto)) tipos.add(tipo);
  }
  return tipos;
}

export interface Sugestao<K extends KitBase> {
  /** Até 3 opções dentro do orçamento, da mais barata para a mais completa. */
  opcoes: K[];
  /** Um kit logo acima do orçamento, quando existe. */
  subir: K | null;
  /** true quando nenhum kit traz tudo o que foi pedido e as opções são as mais próximas. */
  aproximado: boolean;
}

function cobertura(kit: KitBase, desejados: ItemDesejado[]): number {
  if (desejados.length === 0) return 1;
  const tipos = tiposDoKit(kit);
  return desejados.filter((d) => tipos.has(d)).length / desejados.length;
}

/**
 * Três degraus: o mais barato, o do meio e o mais caro que cabem. O do meio
 * fica na média geométrica, para os pulos crescerem juntos (17 → 32 → 62).
 */
function escolherDegraus<K extends KitBase>(ordenados: K[]): K[] {
  if (ordenados.length <= 3) return ordenados;
  const primeiro = ordenados[0];
  const ultimo = ordenados[ordenados.length - 1];
  const alvo = Math.sqrt(precoDoKit(primeiro) * precoDoKit(ultimo));
  const meio = ordenados
    .slice(1, -1)
    .reduce((melhor, k) =>
      Math.abs(precoDoKit(k) - alvo) < Math.abs(precoDoKit(melhor) - alvo) ? k : melhor
    );
  return [primeiro, meio, ultimo];
}

export function sugerirKits<K extends KitBase>(
  kits: K[],
  orcamento: number,
  desejados: ItemDesejado[]
): Sugestao<K> {
  const emEstoque = kits
    .filter((k) => (k.estoque ?? 0) > 0)
    .slice()
    .sort((a, b) => precoDoKit(a) - precoDoKit(b) || a.id - b.id);

  const completos = emEstoque.filter((k) => cobertura(k, desejados) === 1);
  const cabem = completos.filter((k) => precoDoKit(k) <= orcamento);
  // Com opções no orçamento, o "subir" é só um degrau perto; sem nenhuma,
  // é o kit mais em conta que traz tudo, para não deixar a pessoa sem saída.
  const acima = completos.filter((k) => precoDoKit(k) > orcamento);
  const subir =
    (cabem.length > 0
      ? acima.find((k) => precoDoKit(k) <= orcamento * (1 + FOLGA_ACIMA))
      : acima[0]) ?? null;

  if (cabem.length > 0) {
    return { opcoes: escolherDegraus(cabem), subir, aproximado: false };
  }

  // Nada traz tudo dentro do orçamento: mostra os que mais se aproximam.
  const parciais = emEstoque
    .filter((k) => precoDoKit(k) <= orcamento && cobertura(k, desejados) > 0)
    .sort((a, b) => cobertura(b, desejados) - cobertura(a, desejados) || precoDoKit(a) - precoDoKit(b))
    .slice(0, 3)
    .sort((a, b) => precoDoKit(a) - precoDoKit(b));
  return { opcoes: parciais, subir, aproximado: parciais.length > 0 };
}

/** Qualquer botão do site abre o assistente disparando este evento. */
export const EVENTO_MONTAR_KIT = 'ag:montar-kit';

export function abrirMontaKit() {
  window.dispatchEvent(new Event(EVENTO_MONTAR_KIT));
}
