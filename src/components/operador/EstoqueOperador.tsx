import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { formatCurrency } from '../../lib/format';
import { buscarProdutosOperador, precoPixOperador, type ProdutoOperador } from '../../lib/operador';
import s from '../../pages/Operador.module.css';

function normalizar(t: string): string {
  return t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

function totalEstoque(p: ProdutoOperador): number | null {
  return p.variacoes.length > 0 ? p.variacoes.reduce((acc, v) => acc + v.estoque, 0) : p.estoque;
}

/**
 * Estoque que está com o operador, só para consulta. Ele mexe sozinho com os
 * pedidos (baixa quando o pagamento é confirmado, volta quando cancela);
 * acerto de contagem é com o dono, na retaguarda.
 */
export default function EstoqueOperador() {
  const [busca, setBusca] = useState('');
  const [soComEstoque, setSoComEstoque] = useState(true);
  const { data: produtos = [], isLoading, error } = useQuery({
    queryKey: ['operador-produtos'],
    queryFn: buscarProdutosOperador,
    staleTime: 60 * 1000,
  });

  const visiveis = useMemo(() => {
    const termo = normalizar(busca.trim());
    return produtos.filter((p) => {
      const qtd = totalEstoque(p);
      if (soComEstoque && qtd !== null && qtd <= 0) return false;
      if (!termo) return true;
      return normalizar(`${p.nome} ${p.marca ?? ''} ${p.codigo ?? ''}`).includes(termo);
    });
  }, [busca, produtos, soComEstoque]);

  if (isLoading) return <p className={s.vazio}>Carregando estoque…</p>;
  if (error) return <p className={s.erro}>{(error as Error).message}</p>;

  return (
    <>
      <div className={s.secao}>
        <input
          className={s.input}
          placeholder="Buscar produto, marca ou código"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
        <label className={s.checkbox}>
          <input type="checkbox" checked={soComEstoque} onChange={(e) => setSoComEstoque(e.target.checked)} />
          Só produtos com estoque ({visiveis.length})
        </label>
      </div>

      {visiveis.length === 0 ? (
        <p className={s.vazio}>Nenhum produto.</p>
      ) : (
        <div>
          {visiveis.map((p) => {
            const qtd = totalEstoque(p);
            const cor = qtd === null ? '' : qtd <= 0 ? s.zerado : qtd <= 2 ? s.baixo : '';
            return (
              <div key={p.id} className={s.estoqueLinha}>
                <div>
                  <div>{p.nome}</div>
                  <div className={s.resultadoMarca}>
                    {[p.marca, p.codigo, p.variacoes.length === 0 ? `Pix ${formatCurrency(precoPixOperador(p, null))}` : null]
                      .filter(Boolean)
                      .join(' · ')}
                  </div>
                  {p.variacoes.length > 0 && (
                    <div className={s.variacoesTxt}>
                      {p.variacoes.map((v) => `${v.nome}: ${v.estoque}`).join(' · ')}
                    </div>
                  )}
                </div>
                <div className={`${s.estoqueQtd} ${cor}`}>{qtd === null ? '—' : `${qtd} un`}</div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
