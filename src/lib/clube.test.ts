import { describe, expect, it } from 'vitest';
import {
  aniversarioValido,
  custoCupom,
  descreverRegra,
  formatarDataBanco,
  formatarPontos,
  mascararAniversario,
  normalizarWhatsapp,
  percentualDeVolta,
  pontosGanhos,
  pontosParaUsar,
  valorDosPontos,
  whatsappValido,
  type ClubeRegras,
} from './clube';

const REGRAS: ClubeRegras = {
  ativo: true,
  nome: 'Alpha Club',
  pontosPorReal: 1,
  valorPonto: 0.1,
  validadeDias: 365,
  checkoutMaxPercentual: 10,
  cupomValores: [5, 10],
  cupomValidadeDias: 30,
  cupomMinimoMultiplicador: 3,
  bonusBoasVindas: 50,
  bonusAniversario: 100,
  bonusIndicacao: 100,
};

describe('Alpha Club', () => {
  it('normaliza o WhatsApp como o banco (só dígitos, sem 55)', () => {
    expect(normalizarWhatsapp('(11) 99999-0001')).toBe('11999990001');
    expect(normalizarWhatsapp('+55 11 99999-0001')).toBe('11999990001');
    expect(normalizarWhatsapp('(55) 99999-0001')).toBe('55999990001');
    expect(whatsappValido('(11) 9999')).toBe(false);
    expect(whatsappValido('(11) 3333-4444')).toBe(true);
  });

  it('R$ 100 = 100 pontos = R$ 10 (10% de volta)', () => {
    expect(pontosGanhos(100, REGRAS)).toBe(100);
    expect(valorDosPontos(100, REGRAS)).toBe(10);
    expect(percentualDeVolta(REGRAS)).toBe(10);
    expect(descreverRegra(REGRAS)).toBe('Cada R$ 1 = 1 ponto · 100 pontos = R$ 10');
  });

  it('pontos são inteiros e não sofrem com arredondamento de float', () => {
    expect(pontosGanhos(99.9, REGRAS)).toBe(99);
    expect(pontosGanhos(19.9 * 3, REGRAS)).toBe(59);
    expect(pontosGanhos(0, REGRAS)).toBe(0);
    expect(pontosGanhos(-5, REGRAS)).toBe(0);
  });

  it('no checkout: até 10% dos produtos fora de promoção, limitado ao saldo', () => {
    // Exemplo do regulamento: saldo de R$ 10, carrinho de R$ 120 → R$ 10.
    expect(pontosParaUsar(100, 120, REGRAS)).toEqual({ pontos: 100, desconto: 10 });
    // Teto: 10% de R$ 50 = R$ 5 = 50 pontos.
    expect(pontosParaUsar(500, 50, REGRAS)).toEqual({ pontos: 50, desconto: 5 });
    expect(pontosParaUsar(30, 500, REGRAS)).toEqual({ pontos: 30, desconto: 3 });
    expect(pontosParaUsar(100, 0, REGRAS)).toEqual({ pontos: 0, desconto: 0 });
    expect(pontosParaUsar(0, 100, REGRAS)).toEqual({ pontos: 0, desconto: 0 });
  });

  it('cupom custa 10× o valor em pontos', () => {
    expect(custoCupom(5, REGRAS)).toBe(50);
    expect(custoCupom(10, REGRAS)).toBe(100);
    expect(custoCupom(10, { ...REGRAS, valorPonto: 0.05 })).toBe(200);
  });

  it('respeita valores diferentes configurados na retaguarda', () => {
    const dobro = { ...REGRAS, pontosPorReal: 2 };
    expect(pontosGanhos(50, dobro)).toBe(100);
    expect(percentualDeVolta(dobro)).toBe(20);
    expect(descreverRegra(dobro)).toBe('Cada R$ 1 = 2 pontos · 100 pontos = R$ 10');
  });

  it('formata pontos e datas', () => {
    expect(formatarPontos(1)).toBe('1 ponto');
    expect(formatarPontos(1500)).toBe('1.500 pontos');
    expect(formatarDataBanco('2026-10-24')).toBe('24/10/2026');
    expect(formatarDataBanco(null)).toBe('');
  });

  it('aniversário em dia/mês', () => {
    expect(mascararAniversario('1503')).toBe('15/03');
    expect(mascararAniversario('15')).toBe('15');
    expect(aniversarioValido('15/03')).toBe(true);
    expect(aniversarioValido('32/01')).toBe(false);
    expect(aniversarioValido('10/13')).toBe(false);
    expect(aniversarioValido('15')).toBe(false);
  });
});
