import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

/**
 * Endereço, contato e horário da loja, editáveis na retaguarda.
 *
 * Antes estavam escritos à mão em dois lugares — aqui no rodapé e no schema
 * JSON-LD do index.html. Trocar o endereço exigia publicar código, e os dois
 * lugares podiam divergir entre si e do perfil do Google, que é justamente o
 * cruzamento que sustenta a busca local.
 */
export interface DadosLoja {
  endereco: string;
  complemento: string;
  bairro: string;
  cidade: string;
  uf: string;
  cep: string;
  telefone: string;
  email: string;
  instagram: string;
  horaSemanaAbre: string;
  horaSemanaFecha: string;
  horaDomingoAbre: string;
  horaDomingoFecha: string;
}

/**
 * Se o banco não responder, o rodapé ainda precisa mostrar o endereço certo:
 * endereço em branco — ou pior, divergente — contradiz o perfil do Google.
 * Estes valores são os mesmos que a migração gravou.
 */
export const LOJA_PADRAO: DadosLoja = {
  endereco: 'Calçada Flôr de Lótus, 15',
  complemento: 'Centro Comercial Alphaville',
  bairro: 'Alphaville',
  cidade: 'Barueri',
  uf: 'SP',
  cep: '06453-000',
  telefone: '(11) 94292-0076',
  email: 'contato@alphagalerie.com.br',
  instagram: 'alpha.galerie',
  horaSemanaAbre: '11:00',
  horaSemanaFecha: '21:00',
  horaDomingoAbre: '14:00',
  horaDomingoFecha: '19:00',
};

const MAPA: Record<string, keyof DadosLoja> = {
  loja_endereco: 'endereco',
  loja_complemento: 'complemento',
  loja_bairro: 'bairro',
  loja_cidade: 'cidade',
  loja_uf: 'uf',
  loja_cep: 'cep',
  loja_telefone: 'telefone',
  loja_email: 'email',
  loja_instagram: 'instagram',
  loja_hora_semana_abre: 'horaSemanaAbre',
  loja_hora_semana_fecha: 'horaSemanaFecha',
  loja_hora_domingo_abre: 'horaDomingoAbre',
  loja_hora_domingo_fecha: 'horaDomingoFecha',
};

/** "11:00" vira "11h" e "11:30" vira "11h30". */
export function horaCurta(hhmm: string): string {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(hhmm ?? '').trim());
  if (!m) return '';
  return m[2] === '00' ? `${m[1]}h` : `${m[1]}h${m[2]}`;
}

/** "Calçada Flôr de Lótus, 15 — Alphaville, Barueri/SP · 06453-000" */
export function enderecoLinha(loja: DadosLoja): string {
  let linha = loja.endereco.trim();
  if (loja.bairro) linha += (linha ? ' — ' : '') + loja.bairro;
  if (loja.cidade) linha += (linha ? ', ' : '') + loja.cidade;
  if (loja.uf) linha += (loja.cidade ? '/' : linha ? ' ' : '') + loja.uf;
  if (loja.cep) linha += (linha ? ' · ' : '') + loja.cep;
  return linha;
}

/** O link `tel:` precisa de E.164; o que o dono digita é "(11) 94292-0076". */
export function telefoneLink(telefone: string): string {
  const digitos = String(telefone ?? '').replace(/\D/g, '');
  if (!digitos) return '';
  return digitos.startsWith('55') ? `+${digitos}` : `+55${digitos}`;
}

export function instagramUrl(arroba: string): string {
  const limpo = String(arroba ?? '').trim().replace(/^@/, '');
  return limpo ? `https://www.instagram.com/${limpo}` : '';
}

export function mapaUrl(loja: DadosLoja): string {
  const busca = ['Alpha Galerie', loja.endereco, loja.bairro, loja.cidade, loja.uf, loja.cep]
    .filter(Boolean)
    .join(', ');
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(busca)}`;
}

/**
 * Domingo vazio significa fechado — e é por isso que uma linha ausente no
 * banco cai no padrão, mas uma linha presente e vazia não: quem apagou o
 * horário de domingo quis dizer que não abre.
 */
export function horarios(loja: DadosLoja): { dias: string; horas: string }[] {
  const faixa = (abre: string, fecha: string) => {
    const a = horaCurta(abre);
    const f = horaCurta(fecha);
    return a && f ? `${a} às ${f}` : 'Fechado';
  };
  return [
    { dias: 'Segunda a sábado', horas: faixa(loja.horaSemanaAbre, loja.horaSemanaFecha) },
    { dias: 'Domingo', horas: faixa(loja.horaDomingoAbre, loja.horaDomingoFecha) },
  ];
}

async function fetchLoja(): Promise<DadosLoja> {
  const { data, error } = await supabase
    .from('configuracoes')
    .select('chave,valor')
    .in('chave', Object.keys(MAPA));

  if (error || !data) return LOJA_PADRAO;

  const loja = { ...LOJA_PADRAO };
  for (const linha of data) {
    const campo = MAPA[linha.chave as string];
    if (campo) loja[campo] = String(linha.valor ?? '').trim();
  }
  return loja;
}

export function useLoja() {
  const { data } = useQuery<DadosLoja>({
    queryKey: ['dados_loja'],
    queryFn: fetchLoja,
    staleTime: 30 * 60 * 1000,
  });
  // Nunca devolve undefined: o rodapé renderiza no primeiro paint, antes de
  // qualquer resposta, e não pode piscar sem endereço.
  return data ?? LOJA_PADRAO;
}
