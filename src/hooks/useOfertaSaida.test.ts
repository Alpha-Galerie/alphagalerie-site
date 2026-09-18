import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useOfertaSaida, marcarQueJaComprou } from './useOfertaSaida';

function simularSaidaMouse() {
  const ev = new MouseEvent('mouseleave', { clientY: 0, bubbles: true });
  Object.defineProperty(ev, 'clientY', { value: 0 });
  act(() => { document.dispatchEvent(ev); });
}

function usarTouch(ativo: boolean) {
  Object.defineProperty(navigator, 'maxTouchPoints', { value: ativo ? 5 : 0, configurable: true });
  window.matchMedia = ((q: string) => ({
    matches: ativo && q.includes('coarse'),
    media: q, addEventListener() {}, removeEventListener() {},
    addListener() {}, removeListener() {}, onchange: null, dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}

beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers();
  usarTouch(false);
  Object.defineProperty(window, 'scrollY', { value: 0, writable: true, configurable: true });
});

afterEach(() => { vi.useRealTimers(); });

describe('useOfertaSaida', () => {
  it('abre quando o cursor sai pelo topo', () => {
    const { result } = renderHook(() => useOfertaSaida());
    expect(result.current[0]).toBe(false);
    simularSaidaMouse();
    expect(result.current[0]).toBe(true);
  });

  it('abre mesmo com o carrinho cheio — é a venda que interessa salvar', () => {
    // O hook não olha o carrinho de propósito: antes a oferta era suprimida
    // justamente no abandono de carrinho.
    const { result } = renderHook(() => useOfertaSaida());
    simularSaidaMouse();
    expect(result.current[0]).toBe(true);
  });

  it('abre por inatividade no desktop (90s)', () => {
    const { result } = renderHook(() => useOfertaSaida());
    act(() => { vi.advanceTimersByTime(89_000); });
    expect(result.current[0]).toBe(false);
    act(() => { vi.advanceTimersByTime(2_000); });
    expect(result.current[0]).toBe(true);
  });

  it('no celular usa prazo mais curto (45s), já que nao existe mouseleave', () => {
    usarTouch(true);
    const { result } = renderHook(() => useOfertaSaida());
    act(() => { vi.advanceTimersByTime(46_000); });
    expect(result.current[0]).toBe(true);
  });

  it('no celular abre ao voltar rapido para o topo depois de rolar', () => {
    usarTouch(true);
    const { result } = renderHook(() => useOfertaSaida());
    const rolar = (y: number, avancarMs: number) => {
      act(() => {
        (window as unknown as { scrollY: number }).scrollY = y;
        vi.advanceTimersByTime(avancarMs);
        window.dispatchEvent(new Event('scroll'));
      });
    };
    rolar(800, 1000);            // desceu: houve interesse
    expect(result.current[0]).toBe(false);
    rolar(50, 100);              // subiu rápido de volta ao topo
    expect(result.current[0]).toBe(true);
  });

  it('nao abre para quem ja comprou', () => {
    marcarQueJaComprou();
    const { result } = renderHook(() => useOfertaSaida());
    simularSaidaMouse();
    act(() => { vi.advanceTimersByTime(200_000); });
    expect(result.current[0]).toBe(false);
  });

  it('nao insiste com quem ja viu nos ultimos 7 dias', () => {
    const primeira = renderHook(() => useOfertaSaida());
    simularSaidaMouse();
    expect(primeira.result.current[0]).toBe(true);

    const segunda = renderHook(() => useOfertaSaida());
    simularSaidaMouse();
    expect(segunda.result.current[0]).toBe(false);
  });

  it('volta a oferecer depois de 7 dias', () => {
    localStorage.setItem('ag_oferta_mostrada_em', String(Date.now() - 8 * 86_400_000));
    const { result } = renderHook(() => useOfertaSaida());
    simularSaidaMouse();
    expect(result.current[0]).toBe(true);
  });

  it('abre uma vez só, mesmo com varios gatilhos', () => {
    const { result } = renderHook(() => useOfertaSaida());
    simularSaidaMouse();
    const fechar = result.current[1];
    act(() => { fechar(); });
    expect(result.current[0]).toBe(false);
    simularSaidaMouse();
    act(() => { vi.advanceTimersByTime(200_000); });
    expect(result.current[0]).toBe(false);
  });

  it('nao quebra quando o localStorage esta bloqueado (aba anonima)', () => {
    const original = Object.getOwnPropertyDescriptor(window, 'localStorage');
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: { getItem() { throw new Error('bloqueado'); }, setItem() { throw new Error('bloqueado'); }, clear() {} },
    });
    expect(() => {
      const { result } = renderHook(() => useOfertaSaida());
      simularSaidaMouse();
      expect(result.current[0]).toBe(true);
    }).not.toThrow();
    if (original) Object.defineProperty(window, 'localStorage', original);
  });
});
