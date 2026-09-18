import { describe, it, expect } from 'vitest';
import {
  LOJA_PADRAO,
  horaCurta,
  enderecoLinha,
  telefoneLink,
  instagramUrl,
  mapaUrl,
  horarios,
} from './useLoja';

describe('horaCurta', () => {
  it('escreve hora cheia sem os minutos', () => {
    expect(horaCurta('11:00')).toBe('11h');
    expect(horaCurta('09:00')).toBe('09h');
  });

  it('mantém os minutos quando existem', () => {
    expect(horaCurta('11:30')).toBe('11h30');
  });

  it('devolve vazio para o que não é hora', () => {
    expect(horaCurta('')).toBe('');
    expect(horaCurta('onze horas')).toBe('');
    expect(horaCurta('11')).toBe('');
  });
});

describe('enderecoLinha', () => {
  it('monta a linha completa', () => {
    expect(enderecoLinha(LOJA_PADRAO)).toBe(
      'Calçada Flôr de Lótus, 15 — Alphaville, Barueri/SP · 06453-000'
    );
  });

  it('não deixa separador solto quando falta um pedaço', () => {
    const semBairro = enderecoLinha({ ...LOJA_PADRAO, bairro: '' });
    expect(semBairro).toBe('Calçada Flôr de Lótus, 15, Barueri/SP · 06453-000');
    expect(semBairro).not.toMatch(/—\s*,/);

    const semCep = enderecoLinha({ ...LOJA_PADRAO, cep: '' });
    expect(semCep.endsWith('SP')).toBe(true);
    expect(semCep).not.toMatch(/·\s*$/);
  });

  it('não começa com separador quando só há cidade', () => {
    const so = enderecoLinha({
      ...LOJA_PADRAO, endereco: '', bairro: '', cep: '',
    });
    expect(so).toBe('Barueri/SP');
  });
});

describe('telefoneLink', () => {
  it('converte o formato digitado para E.164', () => {
    expect(telefoneLink('(11) 94292-0076')).toBe('+5511942920076');
  });

  it('não duplica o código do país', () => {
    expect(telefoneLink('+55 11 94292-0076')).toBe('+5511942920076');
  });

  it('devolve vazio sem dígitos, para o rodapé não criar um link quebrado', () => {
    expect(telefoneLink('')).toBe('');
    expect(telefoneLink('a combinar')).toBe('');
  });
});

describe('instagramUrl', () => {
  it('monta a URL a partir da arroba', () => {
    expect(instagramUrl('alpha.galerie')).toBe('https://www.instagram.com/alpha.galerie');
  });

  it('tolera o @ que alguém venha a digitar', () => {
    expect(instagramUrl('@alpha.galerie')).toBe('https://www.instagram.com/alpha.galerie');
  });

  it('sem arroba não gera link', () => {
    expect(instagramUrl('')).toBe('');
    expect(instagramUrl('   ')).toBe('');
  });
});

describe('mapaUrl', () => {
  it('leva ao endereço configurado, com os acentos codificados', () => {
    const url = mapaUrl(LOJA_PADRAO);
    expect(url).toContain('Alpha%20Galerie');
    expect(url).toContain('Barueri');
    expect(url).not.toContain('ç');
  });
});

describe('horarios', () => {
  it('mostra as duas faixas configuradas', () => {
    expect(horarios(LOJA_PADRAO)).toEqual([
      { dias: 'Segunda a sábado', horas: '11h às 21h' },
      { dias: 'Domingo', horas: '14h às 19h' },
    ]);
  });

  it('domingo vazio quer dizer fechado, não some da lista', () => {
    const r = horarios({ ...LOJA_PADRAO, horaDomingoAbre: '', horaDomingoFecha: '' });
    expect(r[1]).toEqual({ dias: 'Domingo', horas: 'Fechado' });
  });

  it('meia faixa não vira "11h às" na tela do cliente', () => {
    const r = horarios({ ...LOJA_PADRAO, horaDomingoFecha: '' });
    expect(r[1].horas).toBe('Fechado');
  });
});
