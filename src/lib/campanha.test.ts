import { describe, it, expect } from 'vitest';
import { campanhaNoAr, tempoRestante } from './campanha';

describe('campanhaNoAr', () => {
  it('fica no ar até 30/11 às 23h59 de São Paulo', () => {
    expect(campanhaNoAr(new Date('2026-11-18T12:00:00Z'))).toBe(true);
    expect(campanhaNoAr(new Date('2026-12-01T02:59:00Z'))).toBe(true);
  });

  it('sai do ar em 1º/12', () => {
    expect(campanhaNoAr(new Date('2026-12-01T03:00:00Z'))).toBe(false);
  });
});

describe('tempoRestante', () => {
  it('quebra o que falta em dias, horas, minutos e segundos', () => {
    expect(tempoRestante(new Date('2026-11-30T02:58:58Z'))).toEqual({ dias: 1, horas: 0, minutos: 1, segundos: 1 });
  });

  it('acabou: null', () => {
    expect(tempoRestante(new Date('2026-12-01T03:00:00Z'))).toBeNull();
  });
});
