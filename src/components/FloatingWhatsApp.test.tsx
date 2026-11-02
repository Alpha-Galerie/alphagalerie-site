import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import FloatingWhatsApp from './FloatingWhatsApp';
import { EVENTO_BUSCOU } from '../lib/interesse';

// O balão sobe depois de uma busca com resultado e oferece o que está em
// promoção daquele termo, com o WhatsApp já com a mensagem pronta.

const ofertas = [
  { id: 498, nome: 'DORA GRAPE 20G', preco: 37.63, preco_pix: 35, preco_promocional: 30, imagem_url: null },
];
let filtros: string[] = [];

vi.mock('../lib/supabase', () => {
  const q: Record<string, unknown> = {};
  for (const m of ['select', 'eq', 'gt', 'order']) q[m] = () => q;
  q.ilike = (coluna: string, padrao: string) => { filtros.push(`${coluna}:${padrao}`); return q; };
  q.limit = () => Promise.resolve({ data: ofertas });
  return { supabase: { from: () => q } };
});

function buscou(termo: string) {
  act(() => { window.dispatchEvent(new CustomEvent(EVENTO_BUSCOU, { detail: termo })); });
}

async function esperar() {
  await act(async () => { await vi.advanceTimersByTimeAsync(4000); });
}

beforeEach(() => {
  vi.useFakeTimers();
  sessionStorage.clear();
  filtros = [];
});
afterEach(() => vi.useRealTimers());

function montar() {
  return render(<MemoryRouter><FloatingWhatsApp /></MemoryRouter>);
}

describe('assistente do WhatsApp', () => {
  it('não aparece sem busca', () => {
    montar();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('depois da busca, oferece as ofertas e o WhatsApp com o termo', async () => {
    montar();
    buscou('Tabaco');
    expect(screen.queryByRole('dialog')).toBeNull();
    await esperar();

    expect(screen.getByText(/Procurando/)).toHaveTextContent('Procurando tabaco?');
    expect(screen.getByText('DORA GRAPE 20G')).toBeInTheDocument();
    expect(screen.getByText('-20%')).toBeInTheDocument();
    const whats = screen.getByRole('link', { name: /Falar no WhatsApp/ });
    expect(decodeURIComponent(whats.getAttribute('href')!)).toContain('Estou procurando tabaco');
    expect(filtros).toEqual(['busca_texto:%tabaco%']);
  });

  it('o mesmo termo não aparece de novo na visita', async () => {
    montar();
    buscou('seda');
    await esperar();
    fireEvent.click(screen.getByRole('button', { name: 'Fechar' }));
    buscou('seda');
    await esperar();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('procura cada palavra sem acento e sem pontuação', async () => {
    montar();
    buscou('Carvão (coco), kanara');
    await esperar();
    expect(filtros).toEqual(['busca_texto:%carvao%', 'busca_texto:%coco%', 'busca_texto:%kanara%']);
  });
});
