import { describe, it, expect } from 'vitest';
import { campanhaNoAr } from './campanha';

describe('campanhaNoAr', () => {
  it('fica no ar até 30/11 às 23h59 de São Paulo', () => {
    expect(campanhaNoAr(new Date('2026-11-18T12:00:00Z'))).toBe(true);
    expect(campanhaNoAr(new Date('2026-12-01T02:59:00Z'))).toBe(true);
  });

  it('sai do ar em 1º/12', () => {
    expect(campanhaNoAr(new Date('2026-12-01T03:00:00Z'))).toBe(false);
  });
});
