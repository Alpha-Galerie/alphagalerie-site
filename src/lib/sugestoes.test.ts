import { describe, expect, it } from 'vitest';
import {
  classificarProduto,
  escolherSugestoes,
  subcategoriasDosTipos,
  tiposParaOferecer,
} from './sugestoes';
import type { Produto } from '../types';

function produto(id: number, nome: string, subcategoria: string | null, extra: Partial<Produto> = {}): Produto {
  return {
    id,
    nome,
    marca: '',
    preco: 10,
    preco_pix: null,
    preco_promocional: null,
    categoria_id: 1,
    subcategoria,
    estoque: 10,
    ativo: true,
    destaque: false,
    imagem_url: null,
    _variacoes: [],
    ...extra,
  };
}

describe('classificarProduto', () => {
  it('usa a subcategoria cadastrada', () => {
    expect(classificarProduto({ nome: 'PAY PAY GO GREEN', subcategoria: 'Seda' })).toBe('seda');
    expect(classificarProduto({ nome: 'BIC MINI', subcategoria: 'Isqueiro' })).toBe('isqueiro');
    expect(classificarProduto({ nome: 'ZENGAZ', subcategoria: 'Macarico' })).toBe('isqueiro');
    expect(classificarProduto({ nome: 'ZIGGY', subcategoria: 'Essencias' })).toBe('essencia');
  });

  it('cai para o nome quando a subcategoria é uma marca', () => {
    expect(classificarProduto({ nome: 'SEDA RAW BLACK', subcategoria: 'Raw' })).toBe('seda');
    expect(classificarProduto({ nome: 'RAW - CONE TIPS 25MM', subcategoria: 'Raw' })).toBe('piteira');
    expect(classificarProduto({ nome: 'GRINDER NOWDAYS', subcategoria: 'Nowdays' })).toBe('triturador');
    expect(classificarProduto({ nome: 'ACREMA BLEND 20G', subcategoria: null })).toBe('tabaco');
    expect(classificarProduto({ nome: 'CAMISETA', subcategoria: 'Nowdays' })).toBeNull();
  });
});

describe('tiposParaOferecer', () => {
  it('seda → piteira e isqueiro primeiro', () => {
    expect(tiposParaOferecer([{ nome: 'x', subcategoria: 'Seda' }]).slice(0, 2)).toEqual(['piteira', 'isqueiro']);
  });

  it('piteira → seda; tabaco → seda', () => {
    expect(tiposParaOferecer([{ nome: 'x', subcategoria: 'Piteira' }])[0]).toBe('seda');
    expect(tiposParaOferecer([{ nome: 'x', subcategoria: 'Tabaco' }])[0]).toBe('seda');
  });

  it('não oferece o que já está no carrinho', () => {
    const tipos = tiposParaOferecer([
      { nome: 'x', subcategoria: 'Seda' },
      { nome: 'y', subcategoria: 'Piteira' },
    ]);
    expect(tipos).not.toContain('seda');
    expect(tipos).not.toContain('piteira');
    expect(tipos[0]).toBe('isqueiro');
  });

  it('nada a oferecer para o que não tem par', () => {
    expect(tiposParaOferecer([{ nome: 'CAMISETA', subcategoria: 'Nowdays' }])).toEqual([]);
    expect(subcategoriasDosTipos([])).toEqual([]);
  });
});

describe('escolherSugestoes', () => {
  const candidatos = [
    produto(1, 'PITEIRA CARA', 'Piteira', { preco: 50 }),
    produto(2, 'PITEIRA BARATA', 'Piteira', { preco: 12 }),
    produto(3, 'BIC MINI', 'Isqueiro', { preco: 5 }),
    produto(4, 'ZIPPO', 'Isqueiro', { preco: 320, destaque: true }),
    produto(5, 'TABACO SEM ESTOQUE', 'Tabaco', { estoque: 0 }),
    produto(6, 'TABACO COM VARIACAO', 'Tabaco', {
      _variacoes: [{ id: 1, produto_id: 6, nome: 'A', preco: null, estoque: 3, ordem: 0, ativo: true }],
    }),
  ];

  it('um por tipo, o mais barato — ou o destaque, que a retaguarda escolheu', () => {
    const escolhidos = escolherSugestoes(candidatos, ['piteira', 'isqueiro', 'tabaco'], []);
    expect(escolhidos.map((p) => p.id)).toEqual([2, 4]);
  });

  it('ignora o que já está no carrinho', () => {
    const escolhidos = escolherSugestoes(candidatos, ['piteira'], [2]);
    expect(escolhidos.map((p) => p.id)).toEqual([1]);
  });

  it('respeita o limite', () => {
    expect(escolherSugestoes(candidatos, ['piteira', 'isqueiro'], [], 1)).toHaveLength(1);
  });
});
