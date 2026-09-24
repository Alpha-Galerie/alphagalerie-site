import { supabase } from './supabase';

/**
 * Alpha Club — programa de pontos. As regras moram na tabela `configuracoes`
 * (editáveis na retaguarda) e o banco é quem credita, debita e estorna. Aqui
 * ficam só as contas de exibição, espelhando as do servidor
 * (migração 20260925000000_alpha_club).
 */
export interface ClubeRegras {
  /** false = programa pausado na retaguarda: o site esconde tudo. */
  ativo: boolean;
  nome: string;
  /** Pontos por R$ 1 pago em produtos. */
  pontosPorReal: number;
  /** Quanto vale 1 ponto em reais (0,10 → 100 pontos = R$ 10). */
  valorPonto: number;
  validadeDias: number;
  /** % máximo dos produtos fora de promoção que os pontos pagam no checkout. */
  checkoutMaxPercentual: number;
  /** Valores (R$) dos cupons de troca. */
  cupomValores: number[];
  cupomValidadeDias: number;
  /** Carrinho mínimo = valor do cupom × este número. */
  cupomMinimoMultiplicador: number;
  bonusBoasVindas: number;
  bonusAniversario: number;
  bonusIndicacao: number;
}

export interface ClubeCupom {
  codigo: string;
  valor: number;
  /** yyyy-mm-dd */
  validade: string | null;
  valorMinimo: number;
}

export interface ClubeSaldo {
  /** Já fez a primeira compra paga. */
  participante: boolean;
  pontos: number;
  /** Os pontos em reais. */
  valor: number;
  proximoVencimento: Date | null;
  pontosVencendo: number;
  /** Bônus de aniversário creditado nesta consulta (0 se não). */
  aniversarioPontos: number;
  temAniversario: boolean;
  cupons: ClubeCupom[];
}

function arredondar(valor: number): number {
  return Math.round(valor * 100) / 100;
}

/** Mesma regra de normalizar_whatsapp() no banco: só dígitos, sem o 55. */
export function normalizarWhatsapp(valor: string): string {
  const digitos = valor.replace(/\D/g, '');
  return /^55\d{10,11}$/.test(digitos) ? digitos.slice(2) : digitos;
}

export function whatsappValido(valor: string): boolean {
  return normalizarWhatsapp(valor).length >= 10;
}

/** Pontos que um pedido rende. `valorProdutos` = total pago − frete. */
export function pontosGanhos(valorProdutos: number, regras: ClubeRegras): number {
  if (valorProdutos <= 0) return 0;
  // Soma de float (19,9 × 3) pode dar 59,6999…; o centavo resolve antes do floor.
  return Math.floor(arredondar(valorProdutos * regras.pontosPorReal));
}

export function valorDosPontos(pontos: number, regras: ClubeRegras): number {
  return arredondar(pontos * regras.valorPonto);
}

/**
 * Quantos pontos entram no checkout: até o teto do programa sobre os produtos
 * fora de promoção, limitado ao saldo. Desconto sempre em pontos inteiros.
 */
export function pontosParaUsar(
  saldoPontos: number,
  valorElegivel: number,
  regras: ClubeRegras
): { pontos: number; desconto: number } {
  if (saldoPontos <= 0 || valorElegivel <= 0 || regras.valorPonto <= 0) {
    return { pontos: 0, desconto: 0 };
  }
  const teto = arredondar((valorElegivel * regras.checkoutMaxPercentual) / 100);
  const pontos = Math.max(0, Math.min(saldoPontos, Math.floor(arredondar(teto / regras.valorPonto))));
  return { pontos, desconto: valorDosPontos(pontos, regras) };
}

/** Pontos que um cupom de troca custa (R$ 10 → 100 pontos). */
export function custoCupom(valor: number, regras: ClubeRegras): number {
  if (regras.valorPonto <= 0) return Infinity;
  return Math.ceil(arredondar(valor / regras.valorPonto));
}

/** % de volta em cada compra (1 ponto por real × R$ 0,10 = 10%). */
export function percentualDeVolta(regras: ClubeRegras): number {
  return arredondar(regras.pontosPorReal * regras.valorPonto * 100);
}

export function formatarPontos(pontos: number): string {
  return `${pontos.toLocaleString('pt-BR')} ${pontos === 1 ? 'ponto' : 'pontos'}`;
}

export function formatarReais(valor: number): string {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/** "Cada R$ 1 = 1 ponto · 100 pontos = R$ 10" */
export function descreverRegra(regras: ClubeRegras): string {
  const porReal = regras.pontosPorReal === 1 ? '1 ponto' : `${regras.pontosPorReal.toLocaleString('pt-BR')} pontos`;
  return `Cada R$ 1 = ${porReal} · ${formatarPontos(custoCupom(10, regras))} = R$ 10`;
}

export function formatarDia(data: Date): string {
  return data.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'America/Sao_Paulo',
  });
}

/** "yyyy-mm-dd" (date do banco) → "dd/mm/aaaa", sem cair no fuso. */
export function formatarDataBanco(data: string | null): string {
  if (!data) return '';
  const [a, m, d] = data.slice(0, 10).split('-');
  return a && m && d ? `${d}/${m}/${a}` : data;
}

/** Máscara do campo de aniversário: "1503" → "15/03". */
export function mascararAniversario(valor: string): string {
  const d = valor.replace(/\D/g, '').slice(0, 4);
  return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
}

export function aniversarioValido(valor: string): boolean {
  const m = /^(\d{1,2})\/(\d{1,2})$/.exec(valor.trim());
  if (!m) return false;
  const dia = Number(m[1]);
  const mes = Number(m[2]);
  return dia >= 1 && dia <= 31 && mes >= 1 && mes <= 12;
}

function lerRegras(row: Record<string, unknown>): ClubeRegras {
  const valores = Array.isArray(row.cupom_valores) ? row.cupom_valores : [];
  return {
    ativo: row.ativo === true,
    nome: String(row.nome || 'Alpha Club'),
    pontosPorReal: Number(row.pontos_por_real) || 0,
    valorPonto: Number(row.valor_ponto) || 0,
    validadeDias: Number(row.validade_dias) || 0,
    checkoutMaxPercentual: Number(row.checkout_max_percentual) || 0,
    cupomValores: valores.map(Number).filter((v) => v > 0),
    cupomValidadeDias: Number(row.cupom_validade_dias) || 0,
    cupomMinimoMultiplicador: Number(row.cupom_minimo_multiplicador) || 0,
    bonusBoasVindas: Number(row.bonus_boas_vindas) || 0,
    bonusAniversario: Number(row.bonus_aniversario) || 0,
    bonusIndicacao: Number(row.bonus_indicacao) || 0,
  };
}

// Regras mudam raramente: uma consulta por carregamento de página basta.
// null = a função não existe (banco sem a migração) ou falhou; aí o site age
// como antes do clube. Com o clube pausado as regras chegam com ativo=false.
let regrasPromise: Promise<ClubeRegras | null> | null = null;

export function carregarClubeRegras(): Promise<ClubeRegras | null> {
  if (!regrasPromise) {
    regrasPromise = (async () => {
      try {
        const { data, error } = await supabase.rpc('clube_regras');
        if (error) return null;
        const row = Array.isArray(data) ? data[0] : data;
        if (!row || typeof row !== 'object' || !('ativo' in row)) return null;
        return lerRegras(row as Record<string, unknown>);
      } catch {
        return null;
      }
    })();
  }
  return regrasPromise;
}

/** Só para testes: esquece as regras carregadas. */
export function limparCacheClube(): void {
  regrasPromise = null;
}

export async function consultarClube(whatsapp: string): Promise<ClubeSaldo | null> {
  if (!whatsappValido(whatsapp)) return null;
  try {
    const { data, error } = await supabase.rpc('consultar_clube', {
      p_whatsapp: normalizarWhatsapp(whatsapp),
    });
    if (error || !data || typeof data !== 'object') return null;
    const r = data as Record<string, unknown>;
    const cupons = Array.isArray(r.cupons) ? (r.cupons as Array<Record<string, unknown>>) : [];
    return {
      participante: r.participante === true,
      pontos: Number(r.pontos) || 0,
      valor: Number(r.valor) || 0,
      proximoVencimento: r.proximo_vencimento ? new Date(String(r.proximo_vencimento)) : null,
      pontosVencendo: Number(r.pontos_vencendo) || 0,
      aniversarioPontos: Number(r.aniversario_pontos) || 0,
      temAniversario: r.tem_aniversario === true,
      cupons: cupons.map((c) => ({
        codigo: String(c.codigo),
        valor: Number(c.valor) || 0,
        validade: c.validade ? String(c.validade) : null,
        valorMinimo: Number(c.valor_minimo) || 0,
      })),
    };
  } catch {
    return null;
  }
}

export type ResgateResultado =
  | { ok: true; cupom: ClubeCupom; pontos: number; saldo: number }
  | { ok: false; erro: string };

export async function resgatarCupom(whatsapp: string, valor: number): Promise<ResgateResultado> {
  try {
    const { data, error } = await supabase.rpc('clube_resgatar_cupom', {
      p_whatsapp: normalizarWhatsapp(whatsapp),
      p_valor: valor,
    });
    if (error) return { ok: false, erro: 'Não foi possível trocar agora. Tente de novo.' };
    const r = (data ?? {}) as Record<string, unknown>;
    if (r.success !== true) return { ok: false, erro: String(r.error || 'Não foi possível trocar.') };
    return {
      ok: true,
      pontos: Number(r.pontos) || 0,
      saldo: Number(r.saldo) || 0,
      cupom: {
        codigo: String(r.codigo),
        valor: Number(r.valor) || valor,
        validade: r.validade ? String(r.validade) : null,
        valorMinimo: Number(r.valor_minimo) || 0,
      },
    };
  } catch {
    return { ok: false, erro: 'Não foi possível trocar agora. Tente de novo.' };
  }
}
