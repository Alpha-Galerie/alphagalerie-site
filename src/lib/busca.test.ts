import { describe, it, expect } from 'vitest';
import { normalizarBusca, palavrasBusca } from './busca';

describe('normalizarBusca (mesma regra do banco)', () => {
  it('tira acento, caixa e espaço sobrando', () => {
    expect(normalizarBusca('  Carvão   de COCO ')).toBe('carvao de coco');
    expect(normalizarBusca('Essência')).toBe('essencia');
    expect(normalizarBusca('BALANÇA')).toBe('balanca');
  });
});

describe('palavrasBusca', () => {
  it('separa as palavras já normalizadas', () => {
    expect(palavrasBusca('Carvão  Kanara')).toEqual(['carvao', 'kanara']);
  });

  it('escapa os curingas do like', () => {
    expect(palavrasBusca('mr_lucky 100%')).toEqual(['mr\\_lucky', '100\\%']);
  });

  it('termo vazio não vira filtro', () => {
    expect(palavrasBusca('   ')).toEqual([]);
  });
});
