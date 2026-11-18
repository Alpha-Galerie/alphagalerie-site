// Black November: benefícios em vez de preço baixo. O banner sai do ar
// sozinho depois do fim da campanha; o cashback é a regra do Alpha Club
// configurada na retaguarda (volta a 10% lá).
export const CAMPANHA = {
  nome: 'Black November',
  /** Último instante da campanha: 30/11, 23h59 em São Paulo. */
  fim: new Date('2026-12-01T02:59:59Z'),
  fimTexto: '30/11',
};

export function campanhaNoAr(agora: Date = new Date()): boolean {
  return agora.getTime() <= CAMPANHA.fim.getTime();
}

/** Etiqueta que põe o produto na vitrine relâmpago da campanha. */
export const ETIQUETA_RELAMPAGO = 'Esgotando';

/** Quanto falta para o fim da campanha, já quebrado para o relógio. */
export function tempoRestante(agora: Date = new Date()): { dias: number; horas: number; minutos: number; segundos: number } | null {
  const ms = CAMPANHA.fim.getTime() - agora.getTime();
  if (ms <= 0) return null;
  const s = Math.floor(ms / 1000);
  return {
    dias: Math.floor(s / 86400),
    horas: Math.floor((s % 86400) / 3600),
    minutos: Math.floor((s % 3600) / 60),
    segundos: s % 60,
  };
}
