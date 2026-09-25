import { describe, it, expect } from 'vitest';
import { calcularEntregaProgramada, calcularFrete } from './frete';

describe('calcularFrete', () => {
  it('returns zero and empty label for empty CEP', () => {
    const r = calcularFrete('');
    expect(r.valor).toBe(0);
    expect(r.label).toBe('');
  });

  it('returns R$ 50 for CEP in Gênesis / CENIC range', () => {
    const r = calcularFrete('06454-700');
    expect(r.valor).toBe(50);
    expect(r.label).toMatch(/G.nesis/);
  });

  it('returns R$ 30 for CEP in Barueri range', () => {
    const r = calcularFrete('06454-600');
    expect(r.valor).toBe(30);
    expect(r.label).toMatch(/Barueri/);
  });

  it('returns R$ 30 for cidades vizinhas (Osasco range)', () => {
    const r = calcularFrete('06000-100');
    expect(r.valor).toBe(30);
    expect(r.label).toMatch(/Região próxima/);
  });

  it('returns "a combinar" for national delivery', () => {
    const r = calcularFrete('80010-010');
    expect(r.valor).toBe(0);
    expect(r.label).toMatch(/combinar/i);
  });
});

describe('calcularEntregaProgramada (Pex)', () => {
  // 25/09/2026 é sexta-feira. Horários em São Paulo (-03:00).
  const sexta = (hora: string) => new Date(`2026-09-25T${hora}:00-03:00`);
  const sabado = (hora: string) => new Date(`2026-09-26T${hora}:00-03:00`);
  const domingo = (hora: string) => new Date(`2026-09-27T${hora}:00-03:00`);
  const ddmm = (d: Date) => d.toISOString().slice(5, 10).split('-').reverse().join('/');

  it.each([
    ['06000-000', 'Osasco'],
    ['06299-999', 'Osasco'],
    ['06300-000', 'Carapicuíba'],
    ['06454-700', 'Barueri'],
    ['06500-000', 'Santana de Parnaíba'],
    ['06544-999', 'Santana de Parnaíba'],
    ['06600-000', 'Jandira'],
    ['06650-000', 'Itapevi'],
    ['06700-000', 'Cotia'],
    ['06722-999', 'Cotia'],
  ])('R$ 15 para %s (%s)', (cep, regiao) => {
    const r = calcularEntregaProgramada(cep, sexta('10:00'));
    expect(r?.valor).toBe(15);
    expect(r?.regiao).toBe(regiao);
    expect(r?.label).toBe('Entrega Programada');
  });

  it.each(['', '06545-000', '06725-000', '06750-000', '01000-000', '80010-010'])(
    'fora das regiões contratadas: %s',
    (cep) => {
      expect(calcularEntregaProgramada(cep, sexta('10:00'))).toBeNull();
    }
  );

  it('pedido antes do meio-dia chega no mesmo dia', () => {
    const r = calcularEntregaProgramada('06454-000', sexta('11:59'))!;
    expect(ddmm(r.coleta)).toBe('25/09');
    expect(ddmm(r.chegada)).toBe('25/09');
    expect(r.prazo).toBe('Chega hoje (25/09)');
  });

  it('pedido depois do meio-dia vai na coleta do dia seguinte', () => {
    const r = calcularEntregaProgramada('06454-000', sexta('12:50'))!;
    expect(ddmm(r.chegada)).toBe('26/09');
    expect(r.prazo).toBe('Chega amanhã, sábado (26/09)');
  });

  it('sábado depois do meio-dia pula o domingo', () => {
    const r = calcularEntregaProgramada('06454-000', sabado('13:00'))!;
    expect(ddmm(r.chegada)).toBe('28/09');
    expect(r.prazo).toBe('Chega segunda-feira (28/09)');
  });

  it('domingo não tem coleta, mesmo de manhã', () => {
    const r = calcularEntregaProgramada('06454-000', domingo('09:00'))!;
    expect(ddmm(r.coleta)).toBe('28/09');
    expect(r.prazo).toBe('Chega amanhã, segunda-feira (28/09)');
  });

  it('usa o horário de São Paulo, não o do aparelho', () => {
    // 15:30 UTC = 12:30 em São Paulo: já passou do corte.
    const r = calcularEntregaProgramada('06454-000', new Date('2026-09-25T15:30:00Z'))!;
    expect(ddmm(r.chegada)).toBe('26/09');
  });

  it('Itapevi é D+1: chega no dia seguinte à coleta, sem domingo', () => {
    expect(ddmm(calcularEntregaProgramada('06650-000', sexta('10:00'))!.chegada)).toBe('26/09');
    expect(ddmm(calcularEntregaProgramada('06650-000', sabado('10:00'))!.chegada)).toBe('28/09');
    expect(ddmm(calcularEntregaProgramada('06650-000', sabado('13:00'))!.chegada)).toBe('29/09');
  });

  it('observação para a loja diz coleta e chegada', () => {
    const r = calcularEntregaProgramada('06454-000', sexta('12:50'))!;
    expect(r.observacao).toBe('Entrega Programada (Pex) · coleta sáb. 26/09 12h · chega sáb. 26/09');
  });
});
