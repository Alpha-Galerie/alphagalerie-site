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

  it.each([
    ['06543-340', 'Paiol Velho'],
    ['06501-001', 'Centro'],
    ['06530-000', 'Fazendinha'],
    ['06530-000', 'Colinas da Anhanguera'],
    ['06528-070', 'CHACARA DO SOLAR III'],
    ['06528-070', 'Chácara do Solar I'],
  ])('R$ 35 em Santana, bairro afastado: %s (%s)', (cep, bairro) => {
    const r = calcularFrete(cep, bairro);
    expect(r.valor).toBe(35);
    expect(r.label).toMatch(/afastado/);
  });

  it.each([
    ['06543-001', 'Tamboré'],
    ['06541-005', 'Alphaville'],
    ['06543-340', ''],
    ['06401-000', 'Centro'], // Centro de Barueri não é Santana
    ['06010-000', 'Centro'], // nem o de Osasco
  ])('segue R$ 30 fora dos bairros afastados de Santana: %s (%s)', (cep, bairro) => {
    expect(calcularFrete(cep, bairro).valor).toBe(30);
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
    ['06000-000', 'Osasco', 15],
    ['06299-999', 'Osasco', 15],
    ['06300-000', 'Carapicuíba', 15],
    ['06400-000', 'Barueri', 15],
    ['06454-699', 'Barueri', 15],
    ['06454-700', 'Gênesis / CENIC', 20],
    ['06454-999', 'Gênesis / CENIC', 20],
    ['06455-000', 'Barueri', 15],
    ['06500-000', 'Santana de Parnaíba', 15],
    ['06544-999', 'Santana de Parnaíba', 15],
    ['06600-000', 'Jandira', 15],
    ['06650-000', 'Itapevi', 15],
    ['06700-000', 'Cotia', 15],
    ['06722-999', 'Cotia', 15],
  ])('%s (%s): R$ %d', (cep, regiao, valor) => {
    const r = calcularEntregaProgramada(cep, sexta('10:00'));
    expect(r?.valor).toBe(valor);
    expect(r?.regiao).toBe(regiao);
    expect(r?.label).toBe('Entrega Programada');
  });

  it.each(['', '06545-000', '06725-000', '06750-000', '01000-000', '80010-010'])(
    'fora das regiões contratadas: %s',
    (cep) => {
      expect(calcularEntregaProgramada(cep, sexta('10:00'))).toBeNull();
    }
  );

  it('pedido até 11h29 chega no mesmo dia', () => {
    const r = calcularEntregaProgramada('06454-000', sexta('11:29'))!;
    expect(ddmm(r.coleta)).toBe('25/09');
    expect(ddmm(r.chegada)).toBe('25/09');
    expect(r.prazo).toBe('Chega hoje (25/09)');
  });

  it('a partir das 11h30 vai na coleta do dia seguinte', () => {
    expect(calcularEntregaProgramada('06454-000', sexta('11:30'))!.prazo).toBe('Chega amanhã, sábado (26/09)');
    expect(ddmm(calcularEntregaProgramada('06454-000', sexta('12:50'))!.chegada)).toBe('26/09');
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
    // 14:00 UTC = 11:00 em São Paulo: ainda entra na coleta do dia.
    expect(calcularEntregaProgramada('06454-000', new Date('2026-09-25T14:00:00Z'))!.prazo).toBe('Chega hoje (25/09)');
    // 02:00 UTC de sábado = 23:00 de sexta em São Paulo.
    expect(ddmm(calcularEntregaProgramada('06454-000', new Date('2026-09-26T02:00:00Z'))!.coleta)).toBe('26/09');
  });

  it('feriado não tem coleta: conta o próximo dia útil', () => {
    // Sábado 10/10 à tarde → pula domingo e 12/10 (N. Sra. Aparecida).
    const r = calcularEntregaProgramada('06454-000', new Date('2026-10-10T14:00:00-03:00'))!;
    expect(r.prazo).toBe('Chega terça-feira (13/10)');
    // No próprio feriado, nem de manhã.
    expect(ddmm(calcularEntregaProgramada('06454-000', new Date('2026-10-12T09:00:00-03:00'))!.chegada)).toBe('13/10');
    // Quinta 19/11 à tarde → pula 20/11 (Consciência Negra).
    expect(ddmm(calcularEntregaProgramada('06454-000', new Date('2026-11-19T15:00:00-03:00'))!.chegada)).toBe('21/11');
    // Itapevi D+1 também pula: coleta sáb. 10/10, chega ter. 13/10.
    expect(ddmm(calcularEntregaProgramada('06650-000', new Date('2026-10-10T09:00:00-03:00'))!.chegada)).toBe('13/10');
  });

  it('feriados móveis pela Páscoa (2026: Páscoa em 05/04)', () => {
    const chegaEm = (quando: string) => ddmm(calcularEntregaProgramada('06454-000', new Date(`${quando}:00-03:00`))!.chegada);
    expect(chegaEm('2026-02-14T15:00')).toBe('18/02'); // sáb. → pula dom. e Carnaval (16 e 17/02)
    expect(chegaEm('2026-04-02T15:00')).toBe('04/04'); // qui. → pula Sexta-feira Santa (03/04)
    expect(chegaEm('2026-06-03T15:00')).toBe('05/06'); // qua. → pula Corpus Christi (04/06)
    expect(chegaEm('2027-03-25T15:00')).toBe('27/03'); // 2027: Sexta-feira Santa em 26/03
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
