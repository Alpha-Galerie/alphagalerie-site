import { describe, it, expect } from 'vitest';
import { calcularFrete } from './frete';

describe('calcularFrete', () => {
  it('returns zero and empty label for empty CEP', () => {
    const r = calcularFrete('');
    expect(r.valor).toBe(0);
    expect(r.label).toBe('');
  });

  it('returns R$ 50 for CEP in Gênesis / CENIC range', () => {
    const r = calcularFrete('06454-700');
    expect(r.valor).toBe(50);
    expect(r.label).toMatch(/G.nesis/);
  });

  it('returns R$ 30 for CEP in Barueri range', () => {
    const r = calcularFrete('06454-600');
    expect(r.valor).toBe(30);
    expect(r.label).toMatch(/Barueri/);
  });

  it('returns R$ 30 for cidades vizinhas (Osasco range)', () => {
    const r = calcularFrete('06000-100');
    expect(r.valor).toBe(30);
    expect(r.label).toMatch(/Região próxima/);
  });

  it('returns "a combinar" for national delivery', () => {
    const r = calcularFrete('80010-010');
    expect(r.valor).toBe(0);
    expect(r.label).toMatch(/combinar/i);
  });
});
