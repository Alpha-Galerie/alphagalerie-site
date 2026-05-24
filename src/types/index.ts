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
  categoria_id: number;
  subcategoria: string | null;
  estoque: number | null;
  ativo: boolean;
  destaque: boolean;
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
  pagamento: 'pix' | 'cartao' | 'pagar_retirada';
  entrega: 'retirada' | 'delivery';
  observacoes?: string;
  total: number;
  status: string;
  itens: ItemCarrinho[];
}
