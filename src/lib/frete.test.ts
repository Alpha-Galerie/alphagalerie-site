import { describe, it, expect } from 'vitest';
import { calcularEntregaProgramada, calcularFrete, calcularMotoboyAgora, calcularRotaNoite, ehHorarioNoturno, freteComBeneficio } from './frete';

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
    expect(r.label).toBe('Motoboy · Santana de Parnaíba');
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

  it.each(['', '14010-000', '80010-010'])(
    'fora das regiões contratadas: %s',
    (cep) => {
      expect(calcularEntregaProgramada(cep, sexta('10:00'))).toBeNull();
    }
  );

  it('pedido até 10h59 chega no mesmo dia', () => {
    const r = calcularEntregaProgramada('06454-000', sexta('10:59'))!;
    expect(ddmm(r.coleta)).toBe('25/09');
    expect(ddmm(r.chegada)).toBe('25/09');
    expect(r.prazo).toBe('Chega hoje (25/09)');
  });

  it('a partir das 11h vai na coleta do dia seguinte', () => {
    expect(calcularEntregaProgramada('06454-000', sexta('11:00'))!.prazo).toBe('Chega amanhã, sábado (26/09)');
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
    // 13:30 UTC = 10:30 em São Paulo: ainda entra na coleta do dia.
    expect(calcularEntregaProgramada('06454-000', new Date('2026-09-25T13:30:00Z'))!.prazo).toBe('Chega hoje (25/09)');
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

describe('Pex além da região do motoboy (tabela completa)', () => {
  const sextaManha = new Date('2026-09-25T10:00:00-03:00');

  it('capital, zonas D+0: R$ 15 e chega no mesmo dia', () => {
    for (const cep of ['01310-100', '02012-000', '03163-000', '04538-133', '05402-000', '08230-030']) {
      const r = calcularEntregaProgramada(cep, sextaManha)!;
      expect(r.regiao).toMatch(/^São Paulo/);
      expect(r.valor).toBe(15);
      expect(r.prazo).toBe('Chega hoje (25/09)');
    }
  });

  it('capital, zonas de risco (D+1): R$ 20 e chega no dia seguinte', () => {
    for (const cep of ['04450-000', '04820-000', '04910-000', '05850-000']) {
      const r = calcularEntregaProgramada(cep, sextaManha)!;
      expect(r.valor).toBe(20);
      expect(r.prazo).toBe('Chega amanhã, sábado (26/09)');
    }
    // Perus é D+1 a R$ 15, e vence a sobreposição com Jaraguá.
    expect(calcularEntregaProgramada('05190-000', sextaManha)!.regiao).toBe('São Paulo · Perus');
  });

  it('a capital não tem motoboy: o frete do motoboy segue a combinar', () => {
    expect(calcularFrete('04538-133').valor).toBe(0);
  });

  it('Grande SP pela tabela: mesmo dia', () => {
    for (const [cep, regiao] of [['06760-000', 'Taboão da Serra'], ['07010-000', 'Guarulhos'], ['09010-000', 'Santo André'], ['08780-000', 'Mogi das Cruzes']]) {
      const r = calcularEntregaProgramada(cep, sextaManha)!;
      expect(r.regiao).toBe(regiao);
      expect(r.prazo).toBe('Chega hoje (25/09)');
    }
  });

  it('buracos da tabela ficam fora', () => {
    for (const cep of ['06545-000', '07300-000', '09325-000', '13280-000']) {
      expect(calcularEntregaProgramada(cep, sextaManha)).toBeNull();
    }
  });

  it('interior é D+2, R$ 20, e não entrega sábado', () => {
    const r = calcularEntregaProgramada('13010-000', sextaManha)!;
    expect(r.valor).toBe(20);
    // Coleta sex. 25/09 → pula sábado e domingo → seg. 28 (D+1) → ter. 29 (D+2).
    expect(r.prazo).toBe('Chega terça-feira (29/09)');
    expect(calcularEntregaProgramada('13183-500', sextaManha)!.regiao).toBe('Hortolândia');
  });
});

describe('freteComBeneficio', () => {
  it('abaixo de R$ 200 cobra cheio', () => {
    expect(freteComBeneficio(15, 'programada', 199.99)).toBe(15);
    expect(freteComBeneficio(50, 'motoboy', 150)).toBe(50);
  });

  it('a partir de R$ 200: Programada grátis, motoboy pela metade', () => {
    expect(freteComBeneficio(15, 'programada', 200)).toBe(0);
    expect(freteComBeneficio(50, 'motoboy', 200)).toBe(25);
    expect(freteComBeneficio(35, 'motoboy', 320)).toBe(17.5);
  });
});

describe('calcularRotaNoite (rota das 19h)', () => {
  const as = (hora: string) => new Date(`2026-10-15T${hora}:00-03:00`);

  it('Alphaville até 18h30: R$ 20, sai hoje às 19h', () => {
    const r = calcularRotaNoite('06454-600', '', as('18:29'))!;
    expect(r.valor).toBe(20);
    expect(r.prazo).toBe('Sai hoje às 19h e chega à noite (15/10)');
    expect(r.observacao).toBe('Rota das 19h (Lalamove) · sai qui. 15/10 19h');
  });

  it('fecha às 18h30', () => {
    expect(calcularRotaNoite('06454-600', '', as('18:30'))).toBeNull();
  });

  it.each([
    ['06541-005', 'Alphaville'],
    ['06401-000', 'Centro'],
  ])('atende %s (%s)', (cep, bairro) => {
    expect(calcularRotaNoite(cep, bairro, as('10:00'))).not.toBeNull();
  });

  it.each([
    ['06454-700', ''], // Gênesis / CENIC
    ['06543-340', 'Paiol Velho'], // Santana afastado
    ['06010-000', 'Centro'], // Osasco
    ['01310-100', ''], // capital
  ])('não atende %s (%s)', (cep, bairro) => {
    expect(calcularRotaNoite(cep, bairro, as('10:00'))).toBeNull();
  });
});

describe('Expressa noturna', () => {
  const as = (hora: string) => new Date(`2026-10-15T${hora}:00-03:00`);

  it('vale das 22h às 6h', () => {
    expect(ehHorarioNoturno(as('21:59'))).toBe(false);
    expect(ehHorarioNoturno(as('22:00'))).toBe(true);
    expect(ehHorarioNoturno(as('03:00'))).toBe(true);
    expect(ehHorarioNoturno(as('06:00'))).toBe(false);
  });

  it('até 22h é o motoboy normal', () => {
    expect(calcularMotoboyAgora('06454-600', '', as('21:00'))).toEqual({ valor: 30, label: 'Motoboy · Região Barueri' });
  });

  it('depois das 22h soma R$ 15', () => {
    expect(calcularMotoboyAgora('06454-600', '', as('23:00'))).toEqual({ valor: 45, label: 'Expressa noturna · Região Barueri' });
    expect(calcularMotoboyAgora('06454-700', '', as('23:00')).valor).toBe(65);
  });

  it('frete a combinar segue a combinar', () => {
    expect(calcularMotoboyAgora('80010-010', '', as('23:00')).valor).toBe(0);
  });
});
