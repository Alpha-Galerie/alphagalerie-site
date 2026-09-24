import { supabase } from './supabase';

/**
 * Programa de cashback. As regras moram na tabela `configuracoes` (migração
 * 20260924000000_cashback) e o banco é quem credita, debita e estorna. Aqui só
 * ficam as contas de exibição, espelhando as do servidor.
 */
export interface CashbackRegras {
  /** % do valor pago em produtos que volta como crédito (100 = R$ 1 vira R$ 1). */
  percentual: number;
  /** Dias para usar o crédito depois do pagamento. */
  validadeDias: number;
  /** % máximo do valor dos produtos que o crédito pode pagar. */
  usoMaxPercentual: number;
}

export interface CashbackSaldo {
  saldo: number;
  proximoVencimento: Date | null;
  valorVencendo: number;
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

/** Crédito gerado por um pedido. `valorProdutos` = total pago − frete. */
export function calcularCashbackGanho(valorProdutos: number, regras: CashbackRegras): number {
  if (valorProdutos <= 0) return 0;
  return arredondar((valorProdutos * regras.percentual) / 100);
}

/** Quanto do saldo entra no pedido: nunca mais que o teto do programa. */
export function calcularCashbackUso(
  saldo: number,
  valorProdutos: number,
  regras: CashbackRegras
): number {
  if (saldo <= 0 || valorProdutos <= 0) return 0;
  const teto = arredondar((valorProdutos * regras.usoMaxPercentual) / 100);
  return arredondar(Math.max(0, Math.min(saldo, teto)));
}

/** Último dia para usar um crédito gerado hoje. */
export function validadeCashback(regras: CashbackRegras, hoje: Date = new Date()): Date {
  const data = new Date(hoje);
  data.setDate(data.getDate() + regras.validadeDias);
  return data;
}

export function formatarDia(data: Date): string {
  return data.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    timeZone: 'America/Sao_Paulo',
  });
}

/** "cada R$ 1 gasto vira R$ 1" quando é 1:1; "10% de volta" nos demais. */
export function descreverPercentual(regras: CashbackRegras): string {
  if (regras.percentual === 100) return 'cada R$ 1 gasto vira R$ 1 de volta';
  return `${regras.percentual.toLocaleString('pt-BR')}% de volta`;
}

// Regras mudam raramente: uma consulta por carregamento de página basta.
// Enquanto a migração não estiver aplicada a função não existe, a promessa
// resolve null e o site simplesmente não mostra o programa.
let regrasPromise: Promise<CashbackRegras | null> | null = null;

export function carregarCashbackRegras(): Promise<CashbackRegras | null> {
  if (!regrasPromise) {
    regrasPromise = (async () => {
      try {
        const { data, error } = await supabase.rpc('cashback_regras');
        if (error) return null;
        const row = Array.isArray(data) ? data[0] : data;
        if (!row || row.percentual == null) return null;
        const regras: CashbackRegras = {
          percentual: Number(row.percentual) || 0,
          validadeDias: Number(row.validade_dias) || 0,
          usoMaxPercentual: Number(row.uso_max_percentual) || 0,
        };
        return regras.percentual > 0 && regras.validadeDias > 0 ? regras : null;
      } catch {
        return null;
      }
    })();
  }
  return regrasPromise;
}

/** Só para testes: esquece as regras carregadas. */
export function limparCacheCashback(): void {
  regrasPromise = null;
}

export async function consultarCashback(whatsapp: string): Promise<CashbackSaldo | null> {
  if (!whatsappValido(whatsapp)) return null;
  try {
    const { data, error } = await supabase.rpc('consultar_cashback', {
      p_whatsapp: normalizarWhatsapp(whatsapp),
    });
    if (error) return null;
    const row = Array.isArray(data) ? data[0] : data;
    if (!row) return null;
    return {
      saldo: Number(row.saldo) || 0,
      proximoVencimento: row.proximo_vencimento ? new Date(row.proximo_vencimento) : null,
      valorVencendo: Number(row.valor_vencendo) || 0,
    };
  } catch {
    return null;
  }
}
