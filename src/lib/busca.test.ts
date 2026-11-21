import { describe, expect, it } from 'vitest';
import { paramsDaVitrine } from './busca';

const url = (busca: string) => new URLSearchParams(busca);

describe('paramsDaVitrine', () => {
  it('categoria e subcategoria viram ?cat= e ?sub=', () => {
    expect(paramsDaVitrine(url(''), { categoriaSlug: 'narguile', subcategoria: 'Essencias' }).toString())
      .toBe('cat=narguile&sub=Essencias');
  });

  it('trocar de categoria tira a subcategoria e a busca antigas', () => {
    const r = paramsDaVitrine(url('cat=narguile&sub=Essencias&q=ziggy'), { categoriaSlug: 'headshop', subcategoria: null });
    expect(r.toString()).toBe('cat=headshop');
  });

  it('"Todos" limpa a vitrine e mantém o resto do endereço', () => {
    const r = paramsDaVitrine(url('cat=narguile&sub=Essencias&p=12&utm_source=ig'), { categoriaSlug: null, subcategoria: 'Essencias' });
    expect(r.toString()).toBe('p=12&utm_source=ig');
  });

  it('busca vai para ?q= sem categoria', () => {
    expect(paramsDaVitrine(url('cat=narguile'), { categoriaSlug: null, subcategoria: null, busca: 'ziggy' }).toString())
      .toBe('q=ziggy');
  });
});
