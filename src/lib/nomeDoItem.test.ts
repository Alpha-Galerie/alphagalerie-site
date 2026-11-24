import { describe, expect, it } from 'vitest';
import { nomeDoItem } from './nomeDoItem';

describe('nomeDoItem', () => {
  it('junta a variação ao nome para o pedido', () => {
    expect(nomeDoItem({ nome: 'E-LIQUID 30ML', variacao: 'Doctor · 6mg · Mint' })).toBe('E-LIQUID 30ML — Doctor · 6mg · Mint');
  });

  it('sem variação, fica só o nome', () => {
    expect(nomeDoItem({ nome: 'BIC GRANDE' })).toBe('BIC GRANDE');
  });
});
