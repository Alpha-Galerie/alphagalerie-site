import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { formatCurrency, formatPhone } from '../../lib/format';
import {
  buscarProdutosOperador,
  criarPedidoManual,
  disponivel,
  mensagemCobranca,
  precoPixOperador,
  subtotalLinhas,
  type LinhaPedidoManual,
  type PedidoManualCriado,
  type ProdutoOperador,
  type TipoEntrega,
  type VariacaoOperador,
} from '../../lib/operador';
import PixCobranca from './PixCobranca';
import s from '../../pages/Operador.module.css';

function normalizar(t: string): string {
  return t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

function chave(l: Pick<LinhaPedidoManual, 'produto' | 'variacao'>): string {
  return `${l.produto.id}::${l.variacao?.id ?? ''}`;
}

export default function NovoPedidoOperador() {
  const queryClient = useQueryClient();
  const { data: produtos = [], isLoading, error } = useQuery({
    queryKey: ['operador-produtos'],
    queryFn: buscarProdutosOperador,
    staleTime: 60 * 1000,
  });

  const [busca, setBusca] = useState('');
  const [escolhendo, setEscolhendo] = useState<ProdutoOperador | null>(null);
  const [linhas, setLinhas] = useState<LinhaPedidoManual[]>([]);
  const [nome, setNome] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [entrega, setEntrega] = useState<TipoEntrega>('delivery');
  const [endereco, setEndereco] = useState('');
  const [frete, setFrete] = useState('');
  const [obs, setObs] = useState('');
  const [criado, setCriado] = useState<{ pedido: PedidoManualCriado; nome: string; whatsapp: string } | null>(null);

  const resultados = useMemo(() => {
    const termo = normalizar(busca.trim());
    if (termo.length < 2) return [];
    return produtos
      .filter((p) => normalizar(`${p.nome} ${p.marca ?? ''} ${p.codigo ?? ''}`).includes(termo))
      .slice(0, 30);
  }, [busca, produtos]);

  const valorFrete = entrega === 'retirada' ? 0 : Math.max(Number(frete.replace(',', '.')) || 0, 0);
  const subtotal = subtotalLinhas(linhas);

  const criar = useMutation({
    mutationFn: criarPedidoManual,
    onSuccess: (pedido) => {
      setCriado({ pedido, nome, whatsapp });
      queryClient.invalidateQueries({ queryKey: ['operador-pedidos'] });
    },
  });

  function adicionar(produto: ProdutoOperador, variacao: VariacaoOperador | null) {
    const nova = { produto, variacao, quantidade: 1 };
    setLinhas((atuais) => {
      const existente = atuais.find((l) => chave(l) === chave(nova));
      if (!existente) return [...atuais, nova];
      return atuais.map((l) => (l === existente ? { ...l, quantidade: l.quantidade + 1 } : l));
    });
    setEscolhendo(null);
    setBusca('');
  }

  function escolher(produto: ProdutoOperador) {
    if (produto.variacoes.length > 0) setEscolhendo(produto);
    else adicionar(produto, null);
  }

  function mudarQtd(alvo: LinhaPedidoManual, delta: number) {
    setLinhas((atuais) =>
      atuais
        .map((l) => (l === alvo ? { ...l, quantidade: l.quantidade + delta } : l))
        .filter((l) => l.quantidade > 0)
    );
  }

  function recomecar() {
    setLinhas([]);
    setNome('');
    setWhatsapp('');
    setEntrega('delivery');
    setEndereco('');
    setFrete('');
    setObs('');
    setCriado(null);
    criar.reset();
  }

  function enviar(e: React.FormEvent) {
    e.preventDefault();
    criar.mutate({
      cliente_nome: nome,
      cliente_whatsapp: whatsapp,
      cliente_endereco: endereco,
      tipo_entrega: entrega,
      frete: valorFrete,
      observacoes: obs,
      linhas,
    });
  }

  if (criado) {
    return (
      <div className={s.secao}>
        <span className={s.secaoTitulo}>Pedido {criado.pedido.numero} criado</span>
        <PixCobranca
          valor={criado.pedido.total}
          txid={criado.pedido.numero}
          telefone={criado.whatsapp}
          mensagem={(pix) => mensagemCobranca(criado.nome, criado.pedido, pix)}
        />
        <button type="button" className={s.botaoSec} onClick={recomecar}>
          Fazer outro pedido
        </button>
      </div>
    );
  }

  if (isLoading) return <p className={s.vazio}>Carregando produtos…</p>;
  if (error) return <p className={s.erro}>{(error as Error).message}</p>;

  const excedeEstoque = linhas.some((l) => {
    const d = disponivel(l.produto, l.variacao);
    return d !== null && l.quantidade > d;
  });

  return (
    <form onSubmit={enviar}>
      <div className={s.secao}>
        <span className={s.secaoTitulo}>Produtos</span>
        <input
          className={s.input}
          placeholder="Buscar produto, marca ou código"
          value={busca}
          onChange={(e) => {
            setBusca(e.target.value);
            setEscolhendo(null);
          }}
        />

        {escolhendo && (
          <ul className={s.resultados}>
            <li className={s.resultado} style={{ cursor: 'default' }}>
              <strong>Escolha a variação de {escolhendo.nome}</strong>
            </li>
            {escolhendo.variacoes.map((v) => (
              <li key={v.id}>
                <button type="button" className={s.resultado} disabled={v.estoque <= 0} onClick={() => adicionar(escolhendo, v)}>
                  <span>{v.nome}</span>
                  <span className={s.resultadoPreco}>
                    {formatCurrency(precoPixOperador(escolhendo, v))}
                    <span className={s.estoqueTxt}>{v.estoque} em estoque</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}

        {!escolhendo && resultados.length > 0 && (
          <ul className={s.resultados}>
            {resultados.map((p) => {
              const d = p.variacoes.length > 0 ? p.variacoes.reduce((acc, v) => acc + v.estoque, 0) : p.estoque;
              return (
                <li key={p.id}>
                  <button type="button" className={s.resultado} disabled={d !== null && d <= 0} onClick={() => escolher(p)}>
                    <span className={s.resultadoNome}>
                      <span>{p.nome}</span>
                      {p.marca && <span className={s.resultadoMarca}>{p.marca}</span>}
                    </span>
                    <span className={s.resultadoPreco}>
                      {p.variacoes.length > 0 ? 'ver variações' : formatCurrency(precoPixOperador(p, null))}
                      <span className={s.estoqueTxt}>{d === null ? 'sem controle' : `${d} em estoque`}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        {busca.trim().length >= 2 && !escolhendo && resultados.length === 0 && (
          <p className={s.aviso}>Nenhum produto encontrado.</p>
        )}

        {linhas.length > 0 && (
          <ul className={s.carrinho}>
            {linhas.map((l) => {
              const d = disponivel(l.produto, l.variacao);
              const preco = precoPixOperador(l.produto, l.variacao);
              return (
                <li key={chave(l)} className={s.linha}>
                  <span>
                    {l.produto.nome}
                    {l.variacao ? ` (${l.variacao.nome})` : ''}
                    <span className={s.estoqueTxt}>
                      {formatCurrency(preco)} cada{d !== null && l.quantidade > d ? ` · só tem ${d}` : ''}
                    </span>
                  </span>
                  <span className={s.qtdControle}>
                    <button type="button" onClick={() => mudarQtd(l, -1)} aria-label="Diminuir">−</button>
                    <span>{l.quantidade}</span>
                    <button
                      type="button"
                      onClick={() => mudarQtd(l, 1)}
                      disabled={d !== null && l.quantidade >= d}
                      aria-label="Aumentar"
                    >
                      +
                    </button>
                  </span>
                  <button type="button" className={s.remover} onClick={() => mudarQtd(l, -l.quantidade)} aria-label="Remover">
                    ×
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className={s.secao}>
        <span className={s.secaoTitulo}>Cliente e entrega</span>
        <div className={s.grade2}>
          <label className={s.campo}>
            Nome
            <input className={s.input} value={nome} onChange={(e) => setNome(e.target.value)} required />
          </label>
          <label className={s.campo}>
            WhatsApp
            <input
              className={s.input}
              inputMode="tel"
              placeholder="(11) 99999-9999"
              value={whatsapp}
              onChange={(e) => setWhatsapp(formatPhone(e.target.value))}
              required
            />
          </label>
        </div>
        <label className={s.campo}>
          Entrega
          <select className={s.select} value={entrega} onChange={(e) => setEntrega(e.target.value as TipoEntrega)}>
            <option value="delivery">Delivery</option>
            <option value="programada">Entrega programada</option>
            <option value="retirada">Retirada</option>
          </select>
        </label>
        {entrega !== 'retirada' && (
          <div className={s.grade2}>
            <label className={s.campo}>
              Endereço completo
              <input className={s.input} value={endereco} onChange={(e) => setEndereco(e.target.value)} required />
            </label>
            <label className={s.campo}>
              Frete (R$)
              <input className={s.input} inputMode="decimal" placeholder="0,00" value={frete} onChange={(e) => setFrete(e.target.value)} />
            </label>
          </div>
        )}
        <label className={s.campo}>
          Observações
          <textarea className={s.textarea} value={obs} onChange={(e) => setObs(e.target.value)} />
        </label>
      </div>

      <div className={s.secao}>
        <div className={s.total}>
          <span>Produtos</span>
          <span>{formatCurrency(subtotal)}</span>
        </div>
        {valorFrete > 0 && (
          <div className={s.total} style={{ borderTop: 'none', paddingTop: 0 }}>
            <span>Frete</span>
            <span>{formatCurrency(valorFrete)}</span>
          </div>
        )}
        <div className={s.totalFinal}>
          <span>Total no Pix</span>
          <span>{formatCurrency(subtotal + valorFrete)}</span>
        </div>
        {criar.error && <p className={s.erro}>{(criar.error as Error).message}</p>}
        <button type="submit" className={s.botao} disabled={linhas.length === 0 || excedeEstoque || criar.isPending}>
          {criar.isPending ? 'Criando…' : 'Criar pedido e gerar Pix'}
        </button>
        <p className={s.aviso}>
          O preço é o do Pix na loja, com as promoções que já estão no site. Para usar cupom, mande o cliente fechar
          pelo site.
        </p>
      </div>
    </form>
  );
}
