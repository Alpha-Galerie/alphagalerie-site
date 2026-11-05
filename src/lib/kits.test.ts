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
