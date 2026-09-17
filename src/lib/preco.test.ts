import { describe, it, expect } from 'vitest';
import { getPrecoInfo } from './preco';

const base = { preco: 100, preco_pix: null, preco_promocional: null };

describe('getPrecoInfo', () => {
  it('sem promoção e sem pix, vende pelo preço cheio', () => {
    const info = getPrecoInfo(base);
    expect(info.emPromocao).toBe(false);
    expect(info.precoDe).toBeNull();
    expect(info.precoVenda).toBe(100);
    expect(info.precoFinal).toBe(100);
    expect(info.desconto).toBe(0);
  });

  it('sem promoção, o pix vira o preço final', () => {
    const info = getPrecoInfo({ ...base, preco_pix: 95 });
    expect(info.precoPix).toBe(95);
    expect(info.precoFinal).toBe(95);
    expect(info.emPromocao).toBe(false);
  });

  it('com promoção, risca o preço cheio e calcula o desconto', () => {
    const info = getPrecoInfo({ preco: 107.53, preco_pix: 69.75, preco_promocional: 75 });
    expect(info.emPromocao).toBe(true);
    expect(info.precoDe).toBe(107.53);
    expect(info.precoVenda).toBe(75);
    expect(info.precoPix).toBe(69.75);
    expect(info.precoFinal).toBe(69.75);
    expect(info.desconto).toBe(30);
  });

  it('ignora o pix quando ele não é menor que o preço promocional', () => {
    const info = getPrecoInfo({ preco: 100, preco_pix: 95, preco_promocional: 80 });
    expect(info.precoPix).toBeNull();
    expect(info.precoFinal).toBe(80);
    expect(info.desconto).toBe(20);
  });

  it('ignora promoção maior ou igual ao preço cheio', () => {
    expect(getPrecoInfo({ ...base, preco_promocional: 100 }).emPromocao).toBe(false);
    expect(getPrecoInfo({ ...base, preco_promocional: 120 }).precoVenda).toBe(100);
    expect(getPrecoInfo({ ...base, preco_promocional: 0 }).emPromocao).toBe(false);
  });

  it('preço da variação manda sobre promoção e pix', () => {
    const info = getPrecoInfo(
      { preco: 100, preco_pix: 95, preco_promocional: 80 },
      { preco: 60 }
    );
    expect(info.precoFinal).toBe(60);
    expect(info.precoVenda).toBe(60);
    expect(info.emPromocao).toBe(false);
    expect(info.precoPix).toBeNull();
  });

  it('variação sem preço próprio cai na regra do produto', () => {
    const info = getPrecoInfo({ preco: 100, preco_pix: 95, preco_promocional: 80 }, { preco: null });
    expect(info.precoFinal).toBe(80);
  });
});
