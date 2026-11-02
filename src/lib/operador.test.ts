import { describe, it, expect } from 'vitest';
import {
  disponivel,
  linkWhatsApp,
  mensagemCobranca,
  podeUsarPainel,
  precoPixOperador,
  subtotalLinhas,
  type ProdutoOperador,
} from './operador';

function produto(over: Partial<ProdutoOperador> = {}): ProdutoOperador {
  return {
    id: 1,
    codigo: 'SED',
    nome: 'Seda King',
    marca: 'Raw',
    subcategoria: null,
    preco: 12,
    preco_pix: null,
    preco_promocional: null,
    estoque: 5,
    imagem_url: null,
    variacoes: [],
    ...over,
  };
}

describe('podeUsarPainel', () => {
  it('libera operador e admin, e só eles', () => {
    expect(podeUsarPainel('operador')).toBe(true);
    expect(podeUsarPainel('admin')).toBe(true);
    expect(podeUsarPainel(undefined)).toBe(false);
    expect(podeUsarPainel('cliente')).toBe(false);
  });
});

describe('precoPixOperador (mesma regra que o banco grava)', () => {
  it('usa o preço Pix quando é menor', () => {
    expect(precoPixOperador(produto({ preco_pix: 10 }), null)).toBe(10);
  });

  it('usa o promocional quando o Pix não é menor que ele', () => {
    expect(precoPixOperador(produto({ preco: 200, preco_promocional: 150, preco_pix: 190 }), null)).toBe(150);
  });

  it('variação com preço próprio manda', () => {
    const p = produto({ preco: 25, preco_pix: 20 });
    expect(precoPixOperador(p, { id: 32, nome: 'Uva', preco: 18, estoque: 1 })).toBe(18);
  });

  it('variação sem preço usa a regra do produto', () => {
    const p = produto({ preco: 25, preco_pix: 20 });
    expect(precoPixOperador(p, { id: 31, nome: 'Morango', preco: null, estoque: 4 })).toBe(20);
  });
});

describe('disponivel e subtotal', () => {
  it('variação manda no estoque; NULL é sem controle', () => {
    const v = { id: 31, nome: 'Morango', preco: null, estoque: 4 };
    expect(disponivel(produto(), v)).toBe(4);
    expect(disponivel(produto({ estoque: null }), null)).toBeNull();
  });

  it('soma as linhas pelo preço Pix', () => {
    const linhas = [
      { produto: produto({ preco_pix: 10 }), variacao: null, quantidade: 2 },
      { produto: produto({ id: 2, preco: 200, preco_promocional: 150 }), variacao: null, quantidade: 1 },
    ];
    expect(subtotalLinhas(linhas)).toBe(170);
  });
});

describe('linkWhatsApp', () => {
  it('coloca o 55 em número sem DDI', () => {
    expect(linkWhatsApp('(11) 97777-6666')).toBe('https://wa.me/5511977776666');
  });

  it('mantém número que já tem DDI e codifica o texto', () => {
    expect(linkWhatsApp('5511977776666', 'Oi, tudo?')).toBe('https://wa.me/5511977776666?text=Oi%2C%20tudo%3F');
  });
});

describe('mensagemCobranca', () => {
  it('lista itens, frete, total e o Pix no fim', () => {
    const msg = mensagemCobranca(
      'Bruno Silva',
      {
        numero: 'AGM123',
        frete: 12.5,
        total: 32.5,
        itens: [
          { produto_nome: 'Seda King', variacao: null, quantidade: 2, preco_unitario: 10, subtotal: 20 },
        ],
      },
      'PIXCOPIAECOLA'
    );
    expect(msg).toContain('Olá, Bruno!');
    expect(msg).toContain('AGM123');
    expect(msg).toMatch(/2x Seda King — R\$\s?20,00/);
    expect(msg).toMatch(/Frete: R\$\s?12,50/);
    expect(msg).toMatch(/\*Total no Pix: R\$\s?32,50\*/);
    expect(msg.endsWith('PIXCOPIAECOLA')).toBe(true);
  });

  it('não mostra frete quando é retirada', () => {
    const msg = mensagemCobranca(
      'Ana',
      { numero: 'AGM1', frete: 0, total: 10, itens: [{ produto_nome: 'Seda', variacao: 'Uva', quantidade: 1, preco_unitario: 10, subtotal: 10 }] },
      'PIX'
    );
    expect(msg).not.toContain('Frete');
    expect(msg).toContain('1x Seda (Uva)');
  });
});
