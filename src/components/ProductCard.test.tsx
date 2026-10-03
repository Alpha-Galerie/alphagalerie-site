import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ProductCard from './ProductCard';
import type { Produto } from '../types';

// Kit com foto de cenário não pode ganhar a moldura branca das fotos de
// produto recortado — o cliente vê a borda e acha que a foto foi cortada.

function produto(parcial: Partial<Produto>): Produto {
  return {
    id: 1,
    nome: 'PRODUTO',
    marca: 'ALPHA',
    preco: 26,
    preco_pix: null,
    preco_promocional: null,
    categoria_id: 1,
    subcategoria: 'Seda',
    estoque: 3,
    ativo: true,
    destaque: false,
    imagem_url: 'https://www.alphagalerie.com/foto.jpg',
    _variacoes: [],
    ...parcial,
  };
}

function wrapperDaFoto(p: Produto) {
  render(
    <MemoryRouter>
      <ProductCard produto={p} onAddToCart={vi.fn()} onOpenVariacoes={vi.fn()} />
    </MemoryRouter>
  );
  return screen.getByAltText(p.nome).parentElement as HTMLElement;
}

describe('ProductCard — foto de cenário', () => {
  it('kit ocupa o card inteiro', () => {
    const el = wrapperDaFoto(
      produto({ nome: 'KIT ESSENCIAL ALPHA', subcategoria: 'Kits Exclusivos', imagem_url: '/kits/kit-essencial-v2.jpg' })
    );
    expect(el.className).toMatch(/fotoCheia/);
  });

  it('produto comum continua com a moldura de foto recortada', () => {
    const el = wrapperDaFoto(produto({ nome: 'SEDA RAW' }));
    expect(el.className).not.toMatch(/fotoCheia/);
  });
});
