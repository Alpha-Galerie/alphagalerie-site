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
