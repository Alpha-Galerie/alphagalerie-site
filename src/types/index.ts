export interface Categoria {
  id: number;
  nome: string;
  slug: string;
  ordem: number;
  ativo: boolean;
  oculto: boolean;
}

export interface Variacao {
  id: number;
  produto_id: number;
  nome: string;
  preco: number | null;
  estoque: number;
  ordem: number;
  ativo: boolean;
}

export interface Produto {
  id: number;
  nome: string;
  marca: string;
  preco: number;
  preco_pix: number | null;
  /** Preço promocional ("por"). Quando menor que `preco`, o produto entra em promoção. */
  preco_promocional: number | null;
  categoria_id: number;
  subcategoria: string | null;
  estoque: number | null;
  ativo: boolean;
  destaque: boolean;
  /** Ordem manual na vitrine de destaques (menor primeiro). */
  destaque_ordem?: number | null;
  imagem_url: string | null;
  descricao?: string;
  categorias?: Categoria;
  _variacoes: Variacao[];
}

export interface ItemCarrinho {
  id: number;
  cartKey: string;
  variacaoId?: number;
  codigo?: string;
  nome: string;
  variacao?: string;
  marca: string;
  categoria: string;
  /** Usada para sugerir o que combina (seda → piteira). Ausente em carrinhos antigos. */
  subcategoria?: string | null;
  /** Em promoção: pontos do Alpha Club não pagam este item. O banco confere. */
  promocional?: boolean;
  preco: number;
  imagem: string | null;
  estoque: number | null;
  qtd: number;
}

export interface Pedido {
  id?: number;
  nome: string;
  telefone: string;
  email?: string;
  cep?: string;
  endereco?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  complemento?: string;
  pagamento: 'pix' | 'cartao';
  /** 'programada' = Entrega Programada (coleta da Pex); 'delivery' = motoboy. */
  entrega: 'delivery' | 'programada';
  observacoes?: string;
  /** Frete já incluso em `total`. */
  frete?: number;
  /**
   * Presente só quando o banco tem o Alpha Club. true pede ao banco para
   * abater pontos do WhatsApp; `total` vai sem o abatimento e o banco devolve
   * o total final.
   */
  usarCashback?: boolean;
  /** Código do cupom aplicado; o banco revalida e marca como usado. */
  cupomCodigo?: string;
  /** WhatsApp de quem indicou (Indique e Ganhe). */
  indicadoPor?: string;
  /** "dd/mm" para o bônus de aniversário. */
  aniversario?: string;
  total: number;
  status: string;
  itens: ItemCarrinho[];
}
