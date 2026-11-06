import { describe, expect, it } from 'vitest';
import { itensDoKit } from './kits';

describe('itensDoKit', () => {
  it('lê as linhas com "•" dos kits novos', () => {
    expect(
      itensDoKit({
        subcategoria: 'Kits Exclusivos',
        descricao: 'Um kit exclusivo.\n\nEste kit contém:\n• 2 sedas Pay-Pay Go Green Slim\n• 1 piteira Papelito Mega Longa\n\nFim.',
      })
    ).toEqual(['2 sedas Pay-Pay Go Green Slim', '1 piteira Papelito Mega Longa']);
  });

  it('lê o "Vem no kit: a + b." dos Kits Case Alpha', () => {
    expect(
      itensDoKit({
        subcategoria: 'Kits Exclusivos',
        descricao: 'Vem no kit: Case Alpha 2.0 + tabaco Yerbinha 15g + isqueiro BIC grande. Separado sai R$ 192,00.',
      })
    ).toEqual(['Case Alpha 2.0', 'Tabaco Yerbinha 15g', 'Isqueiro BIC grande']);
  });

  it('produto que não é kit não vira lista', () => {
    expect(itensDoKit({ subcategoria: 'Seda', descricao: '• algo' })).toEqual([]);
  });
});

import { kitNoFiltro } from './kits';

describe('kitNoFiltro', () => {
  const kit = (descricao: string, preco_pix: number) => ({
    nome: 'X KIT ALPHA', subcategoria: 'Kits Exclusivos', descricao, preco: preco_pix + 2, preco_pix,
  });
  const basico = kit('• 1 seda Alpha Hemp\n• 1 piteira Alpha', 17);
  const hash = kit('• 1 tabaco Hash 25g\n• 1 tesoura dobrável prata', 115);
  const yerbinha = kit('• 1 tabaco Yerbinha 15g\n• 1 piteira Alpha', 62);

  it('Até R$ 35 usa o preço do Pix', () => {
    expect(kitNoFiltro(basico, 'ate35')).toBe(true);
    expect(kitNoFiltro(yerbinha, 'ate35')).toBe(false);
  });

  it('Com tabaco e Completos leem os itens do kit', () => {
    expect(kitNoFiltro(yerbinha, 'tabaco')).toBe(true);
    expect(kitNoFiltro(basico, 'tabaco')).toBe(false);
    expect(kitNoFiltro(hash, 'completos')).toBe(true);
    expect(kitNoFiltro(yerbinha, 'completos')).toBe(false);
  });
});

import { nomeCurtoDoItem, nomeDoKitEmTitulo, seoDoKit } from './kits';

describe('seoDoKit', () => {
  it('título começa pelo que se busca (seda, piteira...) e termina no nome do kit', () => {
    const seo = seoDoKit({
      nome: 'ALPHA BIC KIT ALPHA',
      subcategoria: 'Kits Exclusivos',
      descricao: 'X\n• 1 seda Alpha Hemp Brasil Slim Brown\n• 1 piteira Alpha\n• 1 isqueiro BIC grande\n\nY',
    });
    expect(seo.titulo).toBe('Seda Alpha Hemp + Piteira Alpha + Isqueiro BIC | Alpha Bic Kit Alpha');
    expect(seo.descricao).toBe(
      'Seda Alpha Hemp Brasil Slim Brown, piteira Alpha e isqueiro BIC grande: kit exclusivo Alpha Galerie, na embalagem exclusiva. Compre no site e receba em casa.'
    );
  });

  it('tabaco fica fora do título; seda, piteira e tesoura entram primeiro', () => {
    const seo = seoDoKit({
      nome: 'HASH KIT ALPHA',
      subcategoria: 'Kits Exclusivos',
      descricao:
        '• 1 tabaco Hash 25g\n• 1 seda Squadafum King Size Slim\n• 1 seda Alpha Hemp Brasil Slim Brown\n• 1 piteira Alpha\n• 1 isqueiro BIC grande\n• 1 tesoura dobrável prata',
    });
    expect(seo.titulo).toBe('Seda Squadafum + Seda Alpha Hemp + Piteira Alpha + Tesoura dobrável | Hash Kit Alpha');
    expect(seo.descricao.startsWith('Seda Squadafum King Size Slim, seda Alpha Hemp')).toBe(true);
    expect(seo.descricao).toContain('isqueiro BIC grande e tabaco Hash 25g:');
  });

  it('nomes curtos dos itens', () => {
    expect(nomeCurtoDoItem('2 sedas Pay-Pay Go Green Slim')?.rotulo).toBe('2 Sedas Pay-Pay');
    expect(nomeCurtoDoItem('1 dichavador Papelito de acrílico')?.rotulo).toBe('Dichavador Papelito');
    expect(nomeCurtoDoItem('1 Case Alpha 2.0')?.rotulo).toBe('Case Alpha 2.0');
    expect(nomeCurtoDoItem('1 tabaco Acrema Blend 20g')).toBeNull();
  });

  it('nome em título respeita hífen', () => {
    expect(nomeDoKitEmTitulo('ACREMA PAY-PAY KIT ALPHA')).toBe('Acrema Pay-Pay Kit Alpha');
  });
});
