import { describe, expect, it } from 'vitest';
import { gerarCsvCardapio, itensSemFoto, montarCardapio, totalDeItens } from './cardapio99';
import type { Produto } from '../types';

// O 99 Food recusou duas vezes: primeiro o link da loja inteira, depois um
// cardápio com bebida, tabaco, seda e essência — "grocery store: não pertence
// ao segmento de restaurantes". O que estes testes protegem é o recorte que
// sobrou: bebida, e só.

function produto(over: Partial<Produto>): Produto {
  return {
    id: 1,
    nome: 'ITEM',
    marca: '',
    preco: 10,
    preco_pix: null,
    preco_promocional: null,
    categoria_id: 5,
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
  produto({ id: 1, nome: 'COCA COLA LATA', subcategoria: 'COCA COLA LATA' }),
  produto({ id: 2, nome: 'ÁGUA MINERAL', subcategoria: 'ÁGUA MINERAL' }),
  produto({ id: 3, nome: 'RED BULL´S', subcategoria: 'RED BULL´S' }),
  produto({ id: 4, nome: 'CERVEJAS', subcategoria: 'CERVEJAS' }),
  produto({ id: 5, nome: 'SMIRNOFF ICE / SKOL BEATS', subcategoria: 'SMIRNOFF ICE / SKOL BEATS' }),
  produto({ id: 6, nome: 'GARRAFA MAKERS MARK', subcategoria: 'Destilados' }),
  // Fica de fora: larica é o que faz o cardápio parecer mercado, e fumo e
  // acessório são o motivo da primeira recusa.
  produto({ id: 7, nome: 'PRINGLES', subcategoria: 'Laricas' }),
  produto({ id: 8, nome: 'YERBINHA 15G', categoria_id: 1, subcategoria: 'Tabaco' }),
  produto({ id: 9, nome: 'RAW CLASSIC KING SIZE SLIM', categoria_id: 1, subcategoria: 'Seda' }),
  produto({ id: 10, nome: 'ADALYA - HAWAII', categoria_id: 3, subcategoria: 'Essencias' }),
  produto({ id: 11, nome: 'BONG DE VIDRO 30CM', categoria_id: 1, subcategoria: 'Bong De Vidro' }),
  produto({ id: 12, nome: 'OLEO CBD', categoria_id: 4, subcategoria: 'Cbd' }),
];

function porSecao(catalogo: Produto[] = CATALOGO) {
  return Object.fromEntries(
    montarCardapio(catalogo).map((s) => [s.titulo, s.itens.map((i) => i.codigo)])
  );
}

describe('montarCardapio', () => {
  it('abre com os aperitivos e depois separa a bebida pelo álcool', () => {
    expect(montarCardapio(CATALOGO).map((s) => s.titulo)).toEqual([
      'Aperitivos',
      'Sem álcool',
      'Cervejas e drinks',
      'Garrafas',
    ]);

    const secoes = porSecao();
    expect(secoes['Aperitivos']).toEqual(['APR-1', 'APR-2', 'APR-3']);
    expect(secoes['Sem álcool']).toEqual(['2', '1', '3']);
    expect(secoes['Cervejas e drinks']).toEqual(['4', '5']);
    expect(secoes['Garrafas']).toEqual(['6']);
    expect(totalDeItens(montarCardapio(CATALOGO))).toBe(9);
  });

  it('serve os aperitivos mesmo sem catálogo: a cozinha não está no site', () => {
    const [aperitivos] = montarCardapio([]);
    expect(aperitivos.titulo).toBe('Aperitivos');
    expect(aperitivos.itens.map((i) => [i.nome, i.preco])).toEqual([
      ['Porção de batata frita', 30],
      ['Porção de nuggets', 30],
      ['Amendoim japonês', 23],
    ]);
    expect(aperitivos.itens.every((i) => i.disponivel)).toBe(true);
  });

  it('deixa larica, fumo, acessório e CBD fora — foi o que derrubou o cadastro', () => {
    const dentro = montarCardapio(CATALOGO).flatMap((s) => s.itens.map((i) => i.codigo));
    for (const fora of ['7', '8', '9', '10', '11', '12']) {
      expect(dentro).not.toContain(fora);
    }
  });

  it('não oferece a bebida que está zerada — delivery cobra antes de separar', () => {
    const zerado = [produto({ id: 20, nome: 'AGUA DE COCO', subcategoria: 'Aguas', estoque: 0 })];
    expect(montarCardapio(zerado).map((s) => s.titulo)).toEqual(['Aperitivos']);
    expect(totalDeItens(montarCardapio(zerado, { incluirSemEstoque: true }))).toBe(4);
  });

  it('usa o preço de venda, não o do Pix: no app o cliente paga com cartão', () => {
    const catalogo = [
      produto({ id: 30, nome: 'COCA COLA LATA', preco: 20, preco_pix: 15, preco_promocional: 18 }),
    ];
    expect(porSecao(catalogo)['Sem álcool']).toEqual(['30']);
    expect(montarCardapio(catalogo)[1].itens[0].preco).toBe(18);
  });

  it('descreve o item pela marca quando ela não está no nome', () => {
    const catalogo = [
      produto({ id: 40, nome: 'AMENDOIM JAPONES', subcategoria: 'CERVEJAS', marca: 'DORI' }),
      produto({ id: 41, nome: 'CERVEJAS', subcategoria: 'CERVEJAS', marca: 'CERVEJAS' }),
    ];
    const itens = montarCardapio(catalogo)[1].itens;
    expect(itens.find((i) => i.codigo === '40')?.descricao).toBe('Bebida gelada DORI');
    // Marca repetida no nome só polui a linha.
    expect(itens.find((i) => i.codigo === '41')?.descricao).toBe('Bebida gelada');
  });

  it('respeita a descrição cadastrada quando existe', () => {
    const catalogo = [produto({ id: 50, descricao: '  Lata   350 ml ' })];
    expect(montarCardapio(catalogo)[1].itens[0].descricao).toBe('Lata 350 ml');
  });
});

describe('gerarCsvCardapio', () => {
  it('sai no formato que o Excel em pt-BR abre certo', () => {
    const linhas = gerarCsvCardapio(montarCardapio(CATALOGO)).split('\r\n');

    expect(linhas[0]).toBe('\ufeffCategoria;Item;Descrição;Preço (R$);Código;Foto (URL)');
    expect(linhas[1]).toBe('Aperitivos;Porção de batata frita;Porção de 500 g;30,00;APR-1;');
    expect(linhas[4]).toBe('Sem álcool;ÁGUA MINERAL;Bebida gelada;10,00;2;');
  });

  it('protege a célula quando o nome do produto tem ponto e vírgula ou aspas', () => {
    const catalogo = [produto({ id: 60, nome: 'COCA "ZERO"; LATA' })];
    const linha = gerarCsvCardapio(montarCardapio(catalogo)).split('\r\n')[4];
    expect(linha).toBe('Sem álcool;"COCA ""ZERO""; LATA";Bebida gelada;10,00;60;');
  });

  it('descarta imagem em base64: o marketplace não baixa foto de dentro da célula', () => {
    const catalogo = [
      produto({ id: 70, nome: 'AGUA A', imagem_url: 'data:image/png;base64,iVBORw0KGgo=' }),
      produto({ id: 71, nome: 'AGUA B', imagem_url: 'https://cdn.exemplo.com/agua.png' }),
    ];
    const secoes = montarCardapio(catalogo);
    const linhas = gerarCsvCardapio(secoes).split('\r\n');

    expect(linhas[4].endsWith(';70;')).toBe(true);
    expect(linhas[5].endsWith(';71;https://cdn.exemplo.com/agua.png')).toBe(true);
    // Uma bebida em base64 mais as três porções, que ainda não têm foto.
    expect(itensSemFoto(secoes)).toBe(4);
  });
});
