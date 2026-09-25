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
// meio-dia, de segunda a sábado, fora feriados. Pedido até 11h30 (tempo de
// separar) entra na coleta do dia; depois disso, na próxima.
// Faixas de CEP e prazo da tabela Pex Collect (jun/2026). Prazo = dias depois
// da coleta: D+0 chega no dia da coleta, D+1 no dia seguinte.

export const PEX_COLETA_HORA = 12;
const PEX_CORTE_HORA = 11;
const PEX_CORTE_MINUTO = 30;
export const PEX_CORTE_TEXTO = `${PEX_CORTE_HORA}h${PEX_CORTE_MINUTO ? String(PEX_CORTE_MINUTO).padStart(2, '0') : ''}`;

// A primeira faixa que contém o CEP vale: Gênesis / CENIC antes de Barueri.
const PEX_REGIOES: Array<{ regiao: string; de: number; ate: number; prazo: number; valor: number }> = [
  { regiao: 'Osasco', de: 6000000, ate: 6299999, prazo: 0, valor: 15 },
  { regiao: 'Carapicuíba', de: 6300000, ate: 6399999, prazo: 0, valor: 15 },
  // Dentro do condomínio é longe: a programada custa mais que no resto de Barueri.
  { regiao: 'Gênesis / CENIC', de: 6454700, ate: 6454999, prazo: 0, valor: 20 },
  { regiao: 'Barueri', de: 6400000, ate: 6499999, prazo: 0, valor: 15 },
  { regiao: 'Santana de Parnaíba', de: 6500000, ate: 6544999, prazo: 0, valor: 15 },
  { regiao: 'Jandira', de: 6600000, ate: 6649999, prazo: 0, valor: 15 },
  { regiao: 'Itapevi', de: 6650000, ate: 6699999, prazo: 1, valor: 15 },
  { regiao: 'Cotia', de: 6700000, ate: 6722999, prazo: 0, valor: 15 },
];

// Feriado não tem coleta nem entrega: conta o próximo dia útil. Nacionais,
// o estadual de SP (9/7) e os móveis em que a Pex não roda (Carnaval,
// Sexta-feira Santa e Corpus Christi), calculados pela Páscoa.
const FERIADOS_FIXOS = ['01-01', '04-21', '05-01', '07-09', '09-07', '10-12', '11-02', '11-15', '11-20', '12-25'];
const DIAS_DA_PASCOA = [-48, -47, -2, 60];
const feriadosDoAno = new Map<number, Set<string>>();

function mmdd(d: Date): string {
  return `${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

// Domingo de Páscoa (algoritmo de Meeus/Jones/Butcher).
function pascoa(ano: number): Date {
  const a = ano % 19;
  const b = Math.floor(ano / 100);
  const c = ano % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31);
  const dia = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(ano, mes - 1, dia));
}

function ehFeriado(dia: Date): boolean {
  const ano = dia.getUTCFullYear();
  let feriados = feriadosDoAno.get(ano);
  if (!feriados) {
    const p = pascoa(ano);
    feriados = new Set([
      ...FERIADOS_FIXOS,
      ...DIAS_DA_PASCOA.map((n) => mmdd(new Date(Date.UTC(ano, p.getUTCMonth(), p.getUTCDate() + n)))),
    ]);
    feriadosDoAno.set(ano, feriados);
  }
  return feriados.has(mmdd(dia));
}

function temPex(dia: Date): boolean {
  return dia.getUTCDay() !== 0 && !ehFeriado(dia);
}

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
function agoraEmSaoPaulo(agora: Date): { dia: Date; minutos: number } {
  const partes = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    hourCycle: 'h23',
  }).formatToParts(agora);
  const parte = (tipo: string) => Number(partes.find((p) => p.type === tipo)?.value);
  return {
    dia: new Date(Date.UTC(parte('year'), parte('month') - 1, parte('day'))),
    minutos: parte('hour') * 60 + parte('minute'),
  };
}

function proximoDiaPex(dia: Date): Date {
  const d = new Date(dia);
  do d.setUTCDate(d.getUTCDate() + 1);
  while (!temPex(d));
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

  const { dia: hoje, minutos } = agoraEmSaoPaulo(agora);
  let coleta = hoje;
  if (!temPex(hoje) || minutos >= PEX_CORTE_HORA * 60 + PEX_CORTE_MINUTO) coleta = proximoDiaPex(hoje);
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
    valor: faixa.valor,
    label: 'Entrega Programada',
    regiao: faixa.regiao,
    coleta,
    chegada,
    prazo,
    observacao:
      `Entrega Programada (Pex) · coleta ${DIAS_CURTOS[coleta.getUTCDay()]} ${ddmm(coleta)} ${PEX_COLETA_HORA}h` +
      ` · chega ${DIAS_CURTOS[chegada.getUTCDay()]} ${ddmm(chegada)}`,
  };
}
