import { describe, expect, it } from 'vitest';
import {
  calcularCashbackGanho,
  calcularCashbackUso,
  descreverPercentual,
  normalizarWhatsapp,
  validadeCashback,
  whatsappValido,
  type CashbackRegras,
} from './cashback';

const REGRAS: CashbackRegras = { percentual: 100, validadeDias: 30, usoMaxPercentual: 50 };

describe('cashback', () => {
  it('normaliza o WhatsApp como o banco (só dígitos, sem 55)', () => {
    expect(normalizarWhatsapp('(11) 99999-0001')).toBe('11999990001');
    expect(normalizarWhatsapp('+55 11 99999-0001')).toBe('11999990001');
    expect(normalizarWhatsapp('5511999990001')).toBe('11999990001');
    expect(normalizarWhatsapp('(55) 99999-0001')).toBe('55999990001');
    expect(whatsappValido('(11) 9999')).toBe(false);
    expect(whatsappValido('(11) 3333-4444')).toBe(true);
  });

  it('cada R$ 1 gasto vira R$ 1 de cashback', () => {
    expect(calcularCashbackGanho(130, REGRAS)).toBe(130);
    expect(calcularCashbackGanho(0, REGRAS)).toBe(0);
    expect(calcularCashbackGanho(-5, REGRAS)).toBe(0);
  });

  it('respeita o percentual configurado', () => {
    expect(calcularCashbackGanho(99.99, { ...REGRAS, percentual: 10 })).toBe(10);
  });

  it('uso limitado ao teto do programa e ao saldo', () => {
    expect(calcularCashbackUso(120, 90, REGRAS)).toBe(45);
    expect(calcularCashbackUso(20, 90, REGRAS)).toBe(20);
    expect(calcularCashbackUso(120, 90, { ...REGRAS, usoMaxPercentual: 100 })).toBe(90);
    expect(calcularCashbackUso(120, 90, { ...REGRAS, usoMaxPercentual: 0 })).toBe(0);
    expect(calcularCashbackUso(0, 90, REGRAS)).toBe(0);
  });

  it('comprou dia 24/09, usa até 24/10', () => {
    const validade = validadeCashback(REGRAS, new Date(2026, 8, 24, 15, 0));
    expect(validade.getDate()).toBe(24);
    expect(validade.getMonth()).toBe(9);
  });

  it('descreve a regra em uma linha', () => {
    expect(descreverPercentual(REGRAS)).toBe('cada R$ 1 gasto vira R$ 1 de volta');
    expect(descreverPercentual({ ...REGRAS, percentual: 5 })).toBe('5% de volta');
  });
});
