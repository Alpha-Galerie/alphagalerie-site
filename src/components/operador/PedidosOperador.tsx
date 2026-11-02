import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ENTREGA_LABEL,
  buscarPedidosOperador,
  linkWhatsApp,
  mensagemReenvio,
  mudarStatusOperador,
  type PedidoOperador,
} from '../../lib/operador';
import PixCobranca from './PixCobranca';
import s from '../../pages/Operador.module.css';

type Filtro = 'separar' | 'coleta' | 'rota' | 'aguardando' | 'entregues';

const FILTROS: Array<{ id: Filtro; nome: string; inclui: (p: PedidoOperador) => boolean }> = [
  { id: 'separar', nome: 'A separar', inclui: (p) => p.base === 'pago' && p.status !== 'aguardando_coleta' },
  { id: 'coleta', nome: 'Aguardando coleta', inclui: (p) => p.status === 'aguardando_coleta' },
  { id: 'rota', nome: 'Em rota', inclui: (p) => p.base === 'enviado' },
  { id: 'aguardando', nome: 'Aguardando Pix', inclui: (p) => p.base === 'novo' || p.base === 'aguardando_pagamento' },
  { id: 'entregues', nome: 'Entregues', inclui: (p) => p.base === 'entregue' },
];

const dataHora = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
});

/** Próximos passos que o operador pode dar em cada situação do pedido. */
function proximos(p: PedidoOperador): Array<{ status: string; nome: string }> {
  if (p.base === 'pago' && p.status !== 'aguardando_coleta') {
    if (p.tipo_entrega === 'retirada') return [{ status: 'entregue', nome: 'Cliente retirou' }];
    return [
      { status: 'aguardando_coleta', nome: 'Separado · aguardando coleta' },
      { status: 'enviado', nome: 'Saiu para entrega' },
    ];
  }
  if (p.status === 'aguardando_coleta') {
    return [
      { status: 'enviado', nome: 'Saiu para entrega' },
      { status: 'entregue', nome: 'Entregue' },
    ];
  }
  if (p.base === 'enviado') return [{ status: 'entregue', nome: 'Entregue' }];
  return [];
}

function CardPedido({ pedido }: { pedido: PedidoOperador }) {
  const queryClient = useQueryClient();
  const [verPix, setVerPix] = useState(false);
  const mudar = useMutation({
    mutationFn: ({ status }: { status: string }) => mudarStatusOperador(pedido.id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['operador-pedidos'] }),
  });
  const aguardandoPix = pedido.base === 'novo' || pedido.base === 'aguardando_pagamento';

  function cancelar() {
    if (window.confirm(`Cancelar o pedido ${pedido.numero} de ${pedido.cliente_nome}?`)) {
      mudar.mutate({ status: 'cancelado' });
    }
  }

  return (
    <article className={s.card}>
      <div className={s.cardTopo}>
        <div>
          <div className={s.numero}>
            {pedido.numero} · {dataHora.format(new Date(pedido.criado_em))}
            {pedido.origem === 'operador' ? ' · manual' : ''}
          </div>
          <div className={s.cliente}>{pedido.cliente_nome}</div>
        </div>
        <span className={s.selo} style={pedido.status_cor ? { background: pedido.status_cor } : undefined}>
          {pedido.status_nome}
        </span>
      </div>

      <div className={s.info}>
        <a href={linkWhatsApp(pedido.cliente_whatsapp)} target="_blank" rel="noopener noreferrer">
          WhatsApp: {pedido.cliente_whatsapp}
        </a>
        <span>{ENTREGA_LABEL[pedido.tipo_entrega ?? ''] ?? pedido.tipo_entrega ?? '—'}</span>
        {pedido.cliente_endereco && <span>{pedido.cliente_endereco}</span>}
      </div>

      <ul className={s.itens}>
        {pedido.itens.map((item, i) => (
          <li key={i}>
            <span className={s.qtd}>{item.quantidade}x</span>
            {item.nome}
            {item.variacao ? ` (${item.variacao})` : ''}
          </li>
        ))}
      </ul>

      {pedido.observacoes && <p className={s.obs}>Obs.: {pedido.observacoes}</p>}

      {mudar.error && <p className={s.erro} style={{ marginTop: 10 }}>{(mudar.error as Error).message}</p>}

      <div className={s.acoes}>
        {proximos(pedido).map((a) => (
          <button
            key={a.status}
            type="button"
            className={s.botao}
            disabled={mudar.isPending}
            onClick={() => mudar.mutate({ status: a.status })}
          >
            {a.nome}
          </button>
        ))}
        {aguardandoPix && pedido.valor_pix != null && (
          <button type="button" className={s.botaoSec} onClick={() => setVerPix((v) => !v)}>
            {verPix ? 'Fechar Pix' : 'Reenviar Pix'}
          </button>
        )}
        {aguardandoPix && pedido.origem === 'operador' && (
          <button type="button" className={s.botaoPerigo} disabled={mudar.isPending} onClick={cancelar}>
            Cancelar
          </button>
        )}
      </div>

      {verPix && pedido.valor_pix != null && (
        <div style={{ marginTop: 16 }}>
          <PixCobranca
            valor={Number(pedido.valor_pix)}
            txid={pedido.numero}
            telefone={pedido.cliente_whatsapp}
            mensagem={(pix) => mensagemReenvio(pedido, Number(pedido.valor_pix), pix)}
          />
        </div>
      )}
    </article>
  );
}

export default function PedidosOperador() {
  const [filtro, setFiltro] = useState<Filtro>('separar');
  const { data: pedidos = [], isLoading, error } = useQuery({
    queryKey: ['operador-pedidos'],
    queryFn: () => buscarPedidosOperador(30),
    // Pedido novo do site aparece sozinho, sem precisar recarregar.
    refetchInterval: 60 * 1000,
    staleTime: 30 * 1000,
  });

  if (isLoading) return <p className={s.vazio}>Carregando pedidos…</p>;
  if (error) return <p className={s.erro}>{(error as Error).message}</p>;

  const atual = FILTROS.find((f) => f.id === filtro)!;
  const visiveis = pedidos.filter(atual.inclui);

  return (
    <>
      <div className={s.filtros}>
        {FILTROS.map((f) => {
          const n = pedidos.filter(f.inclui).length;
          return (
            <button
              key={f.id}
              type="button"
              className={`${s.filtro} ${f.id === filtro ? s.filtroAtivo : ''}`}
              onClick={() => setFiltro(f.id)}
            >
              {f.nome}
              {n > 0 && <span className={s.contador}>{n}</span>}
            </button>
          );
        })}
      </div>

      {visiveis.length === 0 ? (
        <p className={s.vazio}>Nenhum pedido aqui agora.</p>
      ) : (
        <div className={s.lista}>
          {visiveis.map((p) => (
            <CardPedido key={p.id} pedido={p} />
          ))}
        </div>
      )}
    </>
  );
}
