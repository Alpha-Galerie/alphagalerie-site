export interface FreteResult {
  valor: number;
  label: string;
}

function cepNumero(cep: string): number | null {
  const digits = cep.replace(/\D/g, '');
  if (digits.length < 7) return null;
  return parseInt(digits.slice(0, 8).padEnd(8, '0'), 10);
}

// Bairros de Santana de Parnaíba longe de Alphaville: o Uber sai bem mais
// caro. Vão pelo nome do bairro (o ViaCEP preenche): os CEPs deles se
// misturam com os de Tamboré e Alphaville, que seguem na região próxima.
const SANTANA_AFASTADO = /^centro\b|paiol velho|fazendinha|anhanguera|chacara do solar/;

function semAcento(txt: string): string {
  return txt.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

export function calcularFrete(cep: string, bairro = ''): FreteResult {
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
  // Santana de Parnaíba, bairros afastados
  if (n >= 6500000 && n <= 6549999 && SANTANA_AFASTADO.test(semAcento(bairro))) {
    return { valor: 35, label: 'Motoboy · Santana de Parnaíba' };
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
// meio-dia, de segunda a sábado, fora feriados. Pedido até 11h entra na
// coleta do dia; depois disso, na próxima.
// Faixas de CEP e prazo da tabela Pex Collect (jun/2026, versão completa).
// Prazo = dias depois da coleta: D+0 chega no dia da coleta, D+1 no dia
// seguinte. O valor é o que a loja cobra, arredondado para cima do custo da
// Pex: R$ 12,90 e R$ 14,99 viram R$ 15; R$ 15,90 (zonas D+1 da capital) e
// R$ 17,90 (interior) viram R$ 20. CEP fora das faixas = a Pex não atende.

export const PEX_COLETA_HORA = 12;
// Corte às 11h: dá tempo de separar, embalar e chamar a Pex para a coleta.
const PEX_CORTE_HORA = 11;
const PEX_CORTE_MINUTO = 0;
export const PEX_CORTE_TEXTO = `${PEX_CORTE_HORA}h${PEX_CORTE_MINUTO ? String(PEX_CORTE_MINUTO).padStart(2, '0') : ''}`;

interface FaixaPex {
  regiao: string;
  de: number;
  ate: number;
  prazo: number;
  valor: number;
  /** Interior: a Pex só entrega de segunda a sexta. */
  semSabado?: boolean;
}

function faixa(regiao: string, de: string, ate: string, prazo: number, valor: number, semSabado = false): FaixaPex {
  const n = (cep: string) => parseInt(cep.replace(/\D/g, ''), 10);
  return { regiao, de: n(de), ate: n(ate), prazo, valor, ...(semSabado ? { semSabado } : {}) };
}

// A primeira faixa que contém o CEP vale: Gênesis / CENIC antes de Barueri, e
// Perus (D+1) antes de Jaraguá, porque a tabela da Pex sobrepõe as duas.
const PEX_REGIOES: FaixaPex[] = [
  faixa('São Paulo · Centro', '01000-000', '01599-999', 0, 15),
  faixa('São Paulo · Norte', '02000-000', '02999-999', 0, 15),
  faixa('São Paulo · Leste', '03000-000', '03999-999', 0, 15),
  faixa('São Paulo · Sul', '04000-000', '04399-999', 0, 15),
  faixa('São Paulo · Sul', '04400-000', '04499-999', 1, 20),
  faixa('São Paulo · Sul', '04500-000', '04809-999', 0, 15),
  faixa('São Paulo · Sul', '04800-000', '04863-999', 1, 20),
  faixa('São Paulo · Guarapiranga', '04900-000', '04941-000', 1, 20),
  faixa('São Paulo · Oeste', '05000-000', '05179-999', 0, 15),
  faixa('São Paulo · Perus', '05180-000', '05283-130', 1, 15),
  faixa('São Paulo · Oeste', '05300-000', '05799-999', 0, 15),
  faixa('São Paulo · Capão Redondo', '05800-000', '05899-999', 1, 20),
  faixa('São Paulo · Leste', '08000-000', '08499-999', 0, 15),
  faixa('Osasco', '06000-000', '06299-999', 0, 15),
  faixa('Carapicuíba', '06300-000', '06399-999', 0, 15),
  // Dentro do condomínio é longe: a programada custa mais que no resto de Barueri.
  faixa('Gênesis / CENIC', '06454-700', '06454-999', 0, 20),
  faixa('Barueri', '06400-000', '06499-999', 0, 15),
  faixa('Santana de Parnaíba', '06500-000', '06544-999', 0, 15),
  faixa('Jandira', '06600-000', '06649-999', 0, 15),
  faixa('Itapevi', '06650-000', '06699-999', 1, 15),
  faixa('Cotia', '06700-000', '06729-999', 0, 15),
  faixa('Taboão da Serra', '06750-000', '06799-999', 0, 15),
  faixa('Embu das Artes', '06800-000', '06845-999', 0, 15),
  faixa('Itapecerica da Serra', '06846-000', '06855-999', 0, 15),
  faixa('Guarulhos', '07000-000', '07299-999', 0, 15),
  faixa('Arujá', '07400-000', '07499-899', 0, 15),
  faixa('Mairiporã', '07600-003', '07667-735', 0, 15),
  faixa('Caieiras', '07700-001', '07749-505', 0, 15),
  faixa('Cajamar', '07750-000', '07799-999', 0, 15),
  faixa('Franco da Rocha', '07801-000', '07870-010', 0, 15),
  faixa('Francisco Morato', '07901-000', '07998-070', 0, 15),
  faixa('Ferraz de Vasconcelos', '08500-000', '08545-280', 0, 15),
  faixa('Poá', '08550-000', '08569-999', 0, 15),
  faixa('Itaquaquecetuba', '08570-000', '08599-999', 0, 15),
  faixa('Suzano', '08610-000', '08616-999', 0, 15),
  faixa('Suzano', '08650-000', '08696-999', 0, 15),
  faixa('Mogi das Cruzes', '08710-000', '08850-380', 0, 15),
  faixa('Santo André', '09000-000', '09132-999', 0, 15),
  faixa('Santo André', '09139-000', '09139-999', 0, 15),
  faixa('Santo André', '09169-000', '09299-999', 0, 15),
  faixa('Mauá', '09300-000', '09322-999', 0, 15),
  faixa('Mauá', '09330-000', '09336-999', 0, 15),
  faixa('Mauá', '09340-000', '09341-999', 0, 15),
  faixa('Mauá', '09350-000', '09372-999', 0, 15),
  faixa('Mauá', '09380-000', '09399-999', 0, 15),
  faixa('São Caetano do Sul', '09500-000', '09599-999', 0, 15),
  faixa('São Bernardo do Campo', '09600-000', '09821-999', 0, 15),
  faixa('São Bernardo do Campo', '09840-000', '09846-499', 0, 15),
  faixa('São Bernardo do Campo', '09850-000', '09899-999', 0, 15),
  faixa('Diadema', '09900-000', '09993-335', 0, 15),
  faixa('Campinas', '13000-000', '13139-969', 2, 20, true),
  faixa('Paulínia', '13140-001', '13149-969', 2, 20, true),
  faixa('Sumaré', '13170-001', '13181-999', 2, 20, true),
  faixa('Hortolândia', '13183-001', '13189-969', 2, 20, true),
  faixa('Valinhos', '13270-000', '13279-969', 2, 20, true),
];

// Benefício de frete por valor de compra (produtos, depois do cupom). A Entrega
// Programada custa R$ 15 para a loja e sai grátis; o motoboy custa R$ 30 a 50
// de Uber, então a loja paga metade e não ele inteiro.
export const FRETE_BENEFICIO_A_PARTIR = 200;

export function freteComBeneficio(valor: number, modalidade: 'programada' | 'motoboy', subtotal: number): number {
  if (subtotal < FRETE_BENEFICIO_A_PARTIR) return valor;
  return modalidade === 'programada' ? 0 : Math.round((valor / 2) * 100) / 100;
}

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

function proximoDiaPex(dia: Date, semSabado = false): Date {
  const d = new Date(dia);
  do d.setUTCDate(d.getUTCDate() + 1);
  while (!temPex(d) || (semSabado && d.getUTCDay() === 6));
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
  for (let i = 0; i < faixa.prazo; i++) chegada = proximoDiaPex(chegada, faixa.semSabado);

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

// ── Rota das 19h (Lalamove) ─────────────────────────────────────────────────
// Os pedidos de Alphaville e Barueri que entram até 18h30 saem juntos às 19h,
// numa corrida só do Lalamove com várias paradas. Cotação da loja (out/2026):
// 6 endereços saíram R$ 90 no regular e R$ 118 na prioridade, uns R$ 15 a 20
// por cliente; com 4 ou mais pedidos na rota, R$ 20 paga a entrega.
// Todos os dias. Depois das 18h30 a rota não aparece: fica o motoboy.
// Gênesis / CENIC fica de fora (é longe lá dentro, o motoboy sai R$ 50) e os
// bairros afastados de Santana também.

export const ROTA_VALOR = 20;
export const ROTA_SAIDA_HORA = 19;
const ROTA_CORTE_MINUTOS = 18 * 60 + 30;
export const ROTA_CORTE_TEXTO = '18h30';

function naRegiaoDaRota(n: number, bairro: string): boolean {
  if (n >= 6454700 && n <= 6454999) return false;
  if (n >= 6400000 && n <= 6499999) return true;
  return n >= 6500000 && n <= 6549999 && !SANTANA_AFASTADO.test(semAcento(bairro));
}

export interface RotaNoite extends FreteResult {
  prazo: string;
  observacao: string;
}

/** null = fora de Alphaville/Barueri ou já passou das 18h30. */
export function calcularRotaNoite(cep: string, bairro = '', agora: Date = new Date()): RotaNoite | null {
  const n = cepNumero(cep);
  if (n === null || !naRegiaoDaRota(n, bairro)) return null;
  const { dia, minutos } = agoraEmSaoPaulo(agora);
  if (minutos >= ROTA_CORTE_MINUTOS) return null;
  return {
    valor: ROTA_VALOR,
    label: `Hoje à noite · rota das ${ROTA_SAIDA_HORA}h`,
    prazo: `Sai hoje às ${ROTA_SAIDA_HORA}h e chega à noite (${ddmm(dia)})`,
    observacao: `Rota das ${ROTA_SAIDA_HORA}h (Lalamove) · sai ${DIAS_CURTOS[dia.getUTCDay()]} ${ddmm(dia)} ${ROTA_SAIDA_HORA}h`,
  };
}

// ── Expressa noturna ────────────────────────────────────────────────────────
// Até as 22h o motoboy custa o preço do Uber da região (calcularFrete). Depois
// disso moto é difícil de achar e muitas vezes vai de carro: soma R$ 15.
// Vale das 22h às 6h.

export const NOTURNA_ACRESCIMO = 15;
const NOTURNA_INICIO_MINUTOS = 22 * 60;
const NOTURNA_FIM_MINUTOS = 6 * 60;

export function ehHorarioNoturno(agora: Date = new Date()): boolean {
  const { minutos } = agoraEmSaoPaulo(agora);
  return minutos >= NOTURNA_INICIO_MINUTOS || minutos < NOTURNA_FIM_MINUTOS;
}

/** O motoboy da hora: depois das 22h vira a Expressa noturna, mais cara. */
export function calcularMotoboyAgora(cep: string, bairro = '', agora: Date = new Date()): FreteResult {
  const base = calcularFrete(cep, bairro);
  if (base.valor === 0 || !ehHorarioNoturno(agora)) return base;
  return {
    valor: base.valor + NOTURNA_ACRESCIMO,
    label: `Expressa noturna · ${base.label.replace(/^Motoboy · /, '')}`,
  };
}
