import { describe, expect, it } from 'vitest';
import { gerarCsvCardapio, itensSemFoto, montarCardapio, totalDeItens } from './cardapio99';
import type { Produto } from '../types';

// O cadastro no 99 Food foi reprovado com o link da loja inteira. O que estes
// testes protegem é o recorte: nada além de bebida, tabaco, seda, essência,
// alumínio, carvão, isqueiro, filtro e piteira pode vazar para o cardápio.

function produto(over: Partial<Produto>): Produto {
  return {
    id: 1,
    nome: 'ITEM',
    marca: '',
    preco: 10,
    preco_pix: null,
    preco_promocional: null,
    categoria_id: 1,
    subcategoria: null,
    estoque: 5,
    ativo: true,
    destaque: false,
    imagem_url: null,
    _variacoes: [],
    ...over,
  };
}

const CATALOGO: Produto[] = [
  produto({ id: 1, nome: 'COCA COLA LATA', categoria_id: 5, subcategoria: 'COCA COLA LATA' }),
  produto({ id: 2, nome: 'GARRAFA MAKERS MARK', categoria_id: 5, subcategoria: 'Destilados' }),
  produto({ id: 3, nome: 'PRINGLES', categoria_id: 5, subcategoria: 'Laricas' }),
  produto({ id: 4, nome: 'RAW CLASSIC KING SIZE SLIM', categoria_id: 1, subcategoria: 'Seda', marca: 'RAW' }),
  produto({ id: 5, nome: 'YERBINHA 15G', categoria_id: 1, subcategoria: 'Tabaco', marca: 'ACREMA' }),
  produto({ id: 6, nome: 'BIC GRANDE', categoria_id: 1, subcategoria: 'Isqueiro', marca: 'BIC' }),
  produto({ id: 7, nome: 'ADALYA - HAWAII', categoria_id: 3, subcategoria: 'Essencias', marca: 'ADALYA' }),
  produto({ id: 8, nome: 'ARRA 1KG', categoria_id: 3, subcategoria: 'Carvao', marca: 'carvao arra' }),
  produto({ id: 9, nome: 'ALUMÍNIO PREDATOR', categoria_id: 3, subcategoria: 'Arguile', marca: 'PREDATOR' }),
  // Fica de fora: narguile inteiro, bong, CBD e charuto não vão para o app.
  produto({ id: 10, nome: 'ODUMAN N2', categoria_id: 3, subcategoria: 'Arguile' }),
  produto({ id: 11, nome: 'BONG DE VIDRO 30CM', categoria_id: 1, subcategoria: 'Bong De Vidro' }),
  produto({ id: 12, nome: 'OLEO CBD', categoria_id: 4, subcategoria: 'Cbd' }),
  produto({ id: 13, nome: 'DONA FLOR CORONAS', categoria_id: 2, subcategoria: 'Charutos' }),
];

function titulos(catalogo: Produto[] = CATALOGO) {
  return montarCardapio(catalogo).map((s) => s.titulo);
}

function nomes(catalogo: Produto[], titulo: string) {
  return (montarCardapio(catalogo).find((s) => s.titulo === titulo)?.itens ?? []).map((i) => i.nome);
}

describe('montarCardapio', () => {
  it('leva só as seções liberadas para o marketplace', () => {
    expect(titulos()).toEqual([
      'Bebidas',
      'Destilados e vinhos',
      'Para beliscar',
      'Tabacos',
      'Sedas',
      'Isqueiros',
      'Essências de narguile',
      'Carvão',
      'Papel alumínio',
    ]);
    expect(totalDeItens(montarCardapio(CATALOGO))).toBe(9);
  });

  it('deixa bong, CBD, charuto e narguile fora do cardápio', () => {
    const todos = montarCardapio(CATALOGO).flatMap((s) => s.itens.map((i) => i.id));
    expect(todos).not.toContain(10);
    expect(todos).not.toContain(11);
    expect(todos).not.toContain(12);
    expect(todos).not.toContain(13);
  });

  it('separa o alumínio dos narguiles, que dividem a mesma subcategoria', () => {
    expect(nomes(CATALOGO, 'Papel alumínio')).toEqual(['ALUMÍNIO PREDATOR']);
  });

  it('não oferece o que está zerado — delivery cobra antes de separar', () => {
    const zerado = [produto({ id: 20, nome: 'AGUA DE COCO', categoria_id: 5, subcategoria: 'Aguas', estoque: 0 })];
    expect(montarCardapio(zerado)).toEqual([]);
    expect(totalDeItens(montarCardapio(zerado, { incluirSemEstoque: true }))).toBe(1);
  });

  it('usa o preço de venda, não o do Pix: no app o cliente paga com cartão', () => {
    const catalogo = [
      produto({ id: 30, nome: 'SEDA X', subcategoria: 'Seda', preco: 20, preco_pix: 15, preco_promocional: 18 }),
    ];
    const [secao] = montarCardapio(catalogo);
    expect(secao.itens[0].preco).toBe(18);
  });

  it('descreve o item pela marca quando ela não está no nome', () => {
    const porNome = (id: number) =>
      montarCardapio(CATALOGO)
        .flatMap((s) => s.itens)
        .find((i) => i.id === id)?.descricao;
    expect(porNome(5)).toBe('Tabaco ACREMA');
    // "RAW" já está no nome do produto; repetir só polui a linha.
    expect(porNome(4)).toBe('Seda');
  });

  it('respeita a descrição cadastrada quando existe', () => {
    const catalogo = [
      produto({ id: 40, subcategoria: 'Seda', descricao: '  Seda de cânhamo   king size ' }),
    ];
    expect(montarCardapio(catalogo)[0].itens[0].descricao).toBe('Seda de cânhamo king size');
  });
});

describe('gerarCsvCardapio', () => {
  it('sai no formato que o Excel em pt-BR abre certo', () => {
    const csv = gerarCsvCardapio(montarCardapio(CATALOGO));
    const linhas = csv.split('\r\n');

    expect(csv.startsWith('\ufeff')).toBe(true);
    expect(linhas[0]).toBe('\ufeffCategoria;Item;Descrição;Preço (R$);Código;Foto (URL)');
    expect(linhas[1]).toBe('Bebidas;COCA COLA LATA;Bebida gelada;10,00;1;');
  });

  it('protege a célula quando o nome do produto tem ponto e vírgula ou aspas', () => {
    const catalogo = [produto({ id: 50, nome: 'SEDA "GRANDE"; LONGA', subcategoria: 'Seda' })];
    const linha = gerarCsvCardapio(montarCardapio(catalogo)).split('\r\n')[1];
    expect(linha).toBe('Sedas;"SEDA ""GRANDE""; LONGA";Seda;10,00;50;');
  });
});

describe('fotoPublica', () => {
  it('descarta imagem em base64: o marketplace não baixa foto de dentro da célula', () => {
    const catalogo = [
      produto({ id: 60, nome: 'SEDA A', subcategoria: 'Seda', imagem_url: 'data:image/png;base64,iVBORw0KGgo=' }),
      produto({ id: 61, nome: 'SEDA B', subcategoria: 'Seda', imagem_url: 'https://cdn.exemplo.com/seda.png' }),
    ];
    const secoes = montarCardapio(catalogo);
    const linhas = gerarCsvCardapio(secoes).split('\r\n');

    expect(linhas[1].endsWith(';60;')).toBe(true);
    expect(linhas[2].endsWith(';61;https://cdn.exemplo.com/seda.png')).toBe(true);
    expect(itensSemFoto(secoes)).toBe(1);
  });
});
