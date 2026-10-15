import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import CompraRapida from './CompraRapida';

const kit = { nome: 'Session Nº02 Kraft', itens: ['Seda Alpha Hemp', 'Piteira Papelito'], foto: '/x.webp', preco: 33.9 };

describe('CompraRapida', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('sem saber onde a pessoa está, ainda não mostra o Pix', () => {
    vi.setSystemTime(new Date('2026-10-15T23:00:00-03:00'));
    render(<CompraRapida kit={kit} onClose={vi.fn()} />);
    expect(screen.queryByRole('button', { name: /Copiar Pix/ })).not.toBeInTheDocument();
  });

  it('à noite pelo CEP de Barueri: carro recomendado e somado no Pix', () => {
    vi.setSystemTime(new Date('2026-10-15T23:00:00-03:00'));
    render(<CompraRapida kit={kit} onClose={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('CEP'), { target: { value: '06454-600' } });

    expect(screen.getByRole('radio', { name: /Carro agora/ })).toHaveAttribute('aria-checked', 'true');
    // R$ 33,90 + carro R$ 55 (tabela R$ 30 + R$ 10 do carro + R$ 15 da noite)
    expect(screen.getByRole('button', { name: /Copiar Pix/ }).textContent).toMatch(/88,90/);

    fireEvent.click(screen.getByRole('radio', { name: /Moto agora/ }));
    expect(screen.getByRole('button', { name: /Copiar Pix/ }).textContent).toMatch(/78,90/);
  });

  it('de tarde em Barueri a rota das 19h vem primeiro', () => {
    vi.setSystemTime(new Date('2026-10-15T15:00:00-03:00'));
    render(<CompraRapida kit={kit} onClose={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('CEP'), { target: { value: '06454600' } });
    expect(screen.getByRole('radio', { name: /Rota das 19h/ })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('button', { name: /Copiar Pix/ }).textContent).toMatch(/53,90/);
  });

  it('CEP longe: paga o kit e combina a entrega', () => {
    vi.setSystemTime(new Date('2026-10-15T15:00:00-03:00'));
    render(<CompraRapida kit={kit} onClose={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('CEP'), { target: { value: '80010-010' } });
    expect(screen.getByText(/combina a entrega no WhatsApp/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Copiar Pix/ }).textContent).toMatch(/33,90/);
  });
});
