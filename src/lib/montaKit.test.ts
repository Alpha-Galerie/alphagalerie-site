import { describe, it, expect } from 'vitest';
import { sugerirKits, tiposDoKit, type KitBase } from './montaKit';

const SUB = 'Kits Exclusivos';
function kit(id: number, nome: string, pix: number, itens: string[], estoque = 3): KitBase {
  return {
    id,
    nome,
    subcategoria: SUB,
    preco: pix + 2,
    preco_pix: pix,
    estoque,
    descricao: `Este kit contém:\n${itens.map((i) => `• ${i}`).join('\n')}`,
  };
}

const KITS = [
  kit(1, 'ALPHA KIT ALPHA', 17, ['1 seda Alpha Hemp', '1 piteira Alpha']),
  kit(2, 'ALPHA DUO KIT ALPHA', 25, ['2 sedas Alpha Hemp', '1 piteira Alpha']),
  kit(3, 'ALPHA BIC KIT ALPHA', 32, ['1 seda Alpha Hemp', '1 piteira Alpha', '1 isqueiro BIC grande']),
  kit(4, 'RAW KIT ALPHA', 35, ['1 seda RAW', '1 seda Alpha Hemp', '1 piteira Nowdays']),
  kit(5, 'YERBINHA KIT ALPHA', 62, ['1 tabaco Yerbinha 15g', '1 seda RAW', '1 piteira Alpha', '1 isqueiro BIC grande']),
  kit(6, 'HASH KIT ALPHA', 115, ['1 tabaco Hash', '1 seda', '1 piteira Alpha', '1 isqueiro BIC', '1 tesoura dobrável prata']),
  kit(7, 'KIT CASE ALPHA COMPLETO', 280, ['1 Case Alpha 2.0', '1 tabaco Yerbinha', '1 triturador Squadafum Poli Grinder']),
  kit(8, 'ESGOTADO KIT', 20, ['1 seda', '1 piteira'], 0),
];

describe('tiposDoKit', () => {
  it('lê os itens da descrição', () => {
    expect([...tiposDoKit(KITS[4])].sort()).toEqual(['isqueiro', 'piteira', 'seda', 'tabaco']);
    expect(tiposDoKit(KITS[6]).has('dichavador')).toBe(true);
    expect(tiposDoKit(KITS[6]).has('case')).toBe(true);
  });
});

describe('sugerirKits', () => {
  it('três degraus dentro do orçamento: mais barato, meio e mais completo', () => {
    const r = sugerirKits(KITS, 70, []);
    expect(r.opcoes.map((k) => k.id)).toEqual([1, 3, 5]);
    expect(r.aproximado).toBe(false);
  });

  it('respeita o que não pode faltar', () => {
    const r = sugerirKits(KITS, 70, ['isqueiro']);
    expect(r.opcoes.map((k) => k.id)).toEqual([3, 5]);
  });

  it('não sugere kit esgotado', () => {
    const r = sugerirKits(KITS, 20, []);
    expect(r.opcoes.map((k) => k.id)).toEqual([1]);
  });

  it('sugere subir um degrau quando há kit logo acima do orçamento', () => {
    const r = sugerirKits(KITS, 20, []);
    expect(r.subir?.id).toBe(2);
  });

  it('sem kit completo no orçamento, mostra os mais próximos e avisa', () => {
    const r = sugerirKits(KITS, 35, ['tabaco']);
    expect(r.opcoes).toEqual([]);
    const r2 = sugerirKits(KITS, 40, ['isqueiro', 'tabaco']);
    expect(r2.aproximado).toBe(true);
    expect(r2.opcoes.map((k) => k.id)).toEqual([3]);
  });

  it('orçamento abaixo do kit mais barato não devolve opções', () => {
    const r = sugerirKits(KITS, 10, []);
    expect(r.opcoes).toEqual([]);
    expect(r.subir?.id).toBe(1);
  });
});
