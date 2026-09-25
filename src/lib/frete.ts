export interface FreteResult {
  valor: number;
  label: string;
}

function cepNumero(cep: string): number | null {
  const digits = cep.replace(/\D/g, '');
  if (digits.length < 7) return null;
  return parseInt(digits.slice(0, 8).padEnd(8, '0'), 10);
}

export function calcularFrete(cep: string): FreteResult {
  const n = cepNumero(cep);
  if (n === null) return { valor: 0, label: '' };

  // Alphaville / Gênesis / CENIC (dentro do condomínio)
  if (n >= 6454700 && n <= 6454999) {
    return { valor: 50, label: 'Motoboy · Gênesis / CENIC' };
  }
  // Região Barueri / Alphaville
  if (n >= 6400000 && n <= 6499999) {
    return { valor: 30, label: 'Motoboy · Região Barueri' };
  }
  // Cidades vizinhas (Osasco, Carapicuíba, Itapevi, Jandira, Cotia, Santana de Parnaíba)
  if (n >= 6000000 && n <= 6999999) {
    return { valor: 30, label: 'Motoboy · Região próxima' };
  }
  // Outras regiões — a combinar
  return { valor: 0, label: 'Frete a combinar · Consulte-nos' };
}

// ── Entrega Programada (Pex) ────────────────────────────────────────────────
// Mais barata que o motoboy, mas não sai na hora: a Pex coleta na loja ao
// meio-dia, de segunda a sábado. Pedido até 12h entra na coleta do dia; depois
// disso, na próxima (domingo a Pex não trabalha).
// Faixas de CEP e prazo da tabela Pex Collect (jun/2026). Prazo = dias depois
// da coleta: D+0 chega no dia da coleta, D+1 no dia seguinte.

export const PEX_VALOR = 15;
export const PEX_CORTE_HORA = 12;

const PEX_REGIOES: Array<{ regiao: string; de: number; ate: number; prazo: number }> = [
  { regiao: 'Osasco', de: 6000000, ate: 6299999, prazo: 0 },
  { regiao: 'Carapicuíba', de: 6300000, ate: 6399999, prazo: 0 },
  { regiao: 'Barueri', de: 6400000, ate: 6499999, prazo: 0 },
  { regiao: 'Santana de Parnaíba', de: 6500000, ate: 6544999, prazo: 0 },
  { regiao: 'Jandira', de: 6600000, ate: 6649999, prazo: 0 },
  { regiao: 'Itapevi', de: 6650000, ate: 6699999, prazo: 1 },
  { regiao: 'Cotia', de: 6700000, ate: 6722999, prazo: 0 },
];

const DIAS = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
const DIAS_CURTOS = ['dom.', 'seg.', 'ter.', 'qua.', 'qui.', 'sex.', 'sáb.'];

export interface EntregaProgramada extends FreteResult {
  regiao: string;
  /** Datas no calendário de São Paulo, à meia-noite UTC (use getUTC*). */
  coleta: Date;
  chegada: Date;
  /** Para o cliente: "Chega amanhã, sábado (26/09)". */
  prazo: string;
  /** Para a loja, vai nas observações do pedido. */
  observacao: string;
}

// Dia e hora em São Paulo, independente do fuso do aparelho do cliente.
function agoraEmSaoPaulo(agora: Date): { dia: Date; hora: number } {
  const partes = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    hourCycle: 'h23',
  }).formatToParts(agora);
  const parte = (tipo: string) => Number(partes.find((p) => p.type === tipo)?.value);
  return {
    dia: new Date(Date.UTC(parte('year'), parte('month') - 1, parte('day'))),
    hora: parte('hour'),
  };
}

function proximoDiaPex(dia: Date): Date {
  const d = new Date(dia);
  do d.setUTCDate(d.getUTCDate() + 1);
  while (d.getUTCDay() === 0);
  return d;
}

function ddmm(d: Date): string {
  return `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

/** null = CEP fora das regiões da Pex; aí só o motoboy atende. */
export function calcularEntregaProgramada(cep: string, agora: Date = new Date()): EntregaProgramada | null {
  const n = cepNumero(cep);
  if (n === null) return null;
  const faixa = PEX_REGIOES.find((r) => n >= r.de && n <= r.ate);
  if (!faixa) return null;

  const { dia: hoje, hora } = agoraEmSaoPaulo(agora);
  let coleta = hoje;
  if (hoje.getUTCDay() === 0 || hora >= PEX_CORTE_HORA) coleta = proximoDiaPex(hoje);
  let chegada = coleta;
  for (let i = 0; i < faixa.prazo; i++) chegada = proximoDiaPex(chegada);

  const diasAteChegar = Math.round((chegada.getTime() - hoje.getTime()) / 86400000);
  const prazo =
    diasAteChegar === 0
      ? `Chega hoje (${ddmm(chegada)})`
      : diasAteChegar === 1
        ? `Chega amanhã, ${DIAS[chegada.getUTCDay()]} (${ddmm(chegada)})`
        : `Chega ${DIAS[chegada.getUTCDay()]} (${ddmm(chegada)})`;

  return {
    valor: PEX_VALOR,
    label: 'Entrega Programada',
    regiao: faixa.regiao,
    coleta,
    chegada,
    prazo,
    observacao:
      `Entrega Programada (Pex) · coleta ${DIAS_CURTOS[coleta.getUTCDay()]} ${ddmm(coleta)} ${PEX_CORTE_HORA}h` +
      ` · chega ${DIAS_CURTOS[chegada.getUTCDay()]} ${ddmm(chegada)}`,
  };
}
