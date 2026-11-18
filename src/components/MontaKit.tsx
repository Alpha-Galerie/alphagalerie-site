import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useKits } from '../hooks/useKits';
import { useCarrinhoActions } from '../hooks/useCarrinhoActions';
import { buscarNaVitrine } from '../lib/busca';
import { formatCurrency as fmt } from '../lib/format';
import { itensDoKit, nomeDoKitEmTitulo } from '../lib/kits';
import {
  EVENTO_MONTAR_KIT,
  ITENS_DESEJADOS,
  ORCAMENTOS,
  precoDoKit,
  sugerirKits,
  type ItemDesejado,
} from '../lib/montaKit';
import { buildProductPath } from '../lib/productPath';
import type { Produto } from '../types';
import styles from './MontaKit.module.css';

type Etapa = 'orcamento' | 'itens' | 'resultado';

const ORDINAIS = ['1ª opção', '2ª opção', '3ª opção'];

/**
 * Assistente "Monte seu kit": duas perguntas (quanto gastar e o que não pode
 * faltar) e até três kits exclusivos em degraus de preço, prontos para ir ao
 * carrinho. Fica montado uma vez na página e abre pelo evento.
 */
export default function MontaKit() {
  const [aberto, setAberto] = useState(false);
  const [etapa, setEtapa] = useState<Etapa>('orcamento');
  const [orcamento, setOrcamento] = useState<number | null>(null);
  const [outro, setOutro] = useState('');
  const [desejados, setDesejados] = useState<ItemDesejado[]>([]);
  const [adicionados, setAdicionados] = useState<number[]>([]);
  const dialogRef = useRef<HTMLDivElement>(null);
  const { data: kits = [] } = useKits();
  const { adicionar } = useCarrinhoActions();

  useEffect(() => {
    function abrir() {
      setEtapa('orcamento');
      setOrcamento(null);
      setOutro('');
      setDesejados([]);
      setAdicionados([]);
      setAberto(true);
    }
    window.addEventListener(EVENTO_MONTAR_KIT, abrir);
    return () => window.removeEventListener(EVENTO_MONTAR_KIT, abrir);
  }, []);

  useEffect(() => {
    if (!aberto) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setAberto(false);
    }
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    dialogRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [aberto]);

  if (!aberto) return null;

  function escolherOrcamento(valor: number) {
    setOrcamento(valor);
    setEtapa('itens');
  }

  function usarOutro(e: React.FormEvent) {
    e.preventDefault();
    const valor = Number(outro.replace(/[^\d,.]/g, '').replace(',', '.'));
    if (Number.isFinite(valor) && valor > 0) escolherOrcamento(valor);
  }

  function alternar(item: ItemDesejado) {
    setDesejados((atual) => (atual.includes(item) ? atual.filter((i) => i !== item) : [...atual, item]));
  }

  function noCarrinho(kit: Produto) {
    adicionar(kit);
    setAdicionados((a) => [...a, kit.id]);
  }

  function buscarAvulso() {
    const termo = desejados.length > 0 ? desejados.join(' ') : 'seda';
    setAberto(false);
    buscarNaVitrine(termo);
  }

  const sugestao = orcamento !== null ? sugerirKits(kits, orcamento, desejados) : null;

  function renderKit(kit: Produto, rotulo: string, destaque = false) {
    const itens = itensDoKit(kit);
    const jaFoi = adicionados.includes(kit.id);
    return (
      <li key={kit.id} className={`${styles.opcao} ${destaque ? styles.opcaoSubir : ''}`}>
        {kit.imagem_url && (
          <img className={styles.foto} src={kit.imagem_url} alt="" loading="lazy" decoding="async" />
        )}
        <div className={styles.opcaoTexto}>
          <span className={styles.ordinal}>{rotulo}</span>
          <strong className={styles.nome}>{nomeDoKitEmTitulo(kit.nome)}</strong>
          {itens.length > 0 && (
            <ul className={styles.itens}>
              {itens.map((i) => (
                <li key={i}>{i}</li>
              ))}
            </ul>
          )}
          <div className={styles.opcaoRodape}>
            <span className={styles.preco}>
              {fmt(precoDoKit(kit))} <small>no Pix</small>
            </span>
            <div className={styles.acoes}>
              <Link to={buildProductPath(kit)} className={styles.ver} onClick={() => setAberto(false)}>
                Ver
              </Link>
              <button type="button" className={styles.add} onClick={() => noCarrinho(kit)} disabled={jaFoi}>
                {jaFoi ? 'No carrinho ✓' : 'Quero esse'}
              </button>
            </div>
          </div>
        </div>
      </li>
    );
  }

  return (
    <div className={styles.fundo} onClick={() => setAberto(false)}>
      <div
        ref={dialogRef}
        className={styles.janela}
        role="dialog"
        aria-modal="true"
        aria-labelledby="montakit-titulo"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" className={styles.fechar} onClick={() => setAberto(false)} aria-label="Fechar">
          ×
        </button>

        <p className={styles.eyebrow}>✦ Assistente Alpha</p>

        {etapa === 'orcamento' && (
          <>
            <h2 className={styles.titulo} id="montakit-titulo">
              Monte seu kit em <em>10 segundos</em>.
            </h2>
            <p className={styles.pergunta}>Até quanto você quer gastar?</p>
            <div className={styles.chips}>
              {ORCAMENTOS.map((v) => (
                <button key={v} type="button" className={styles.chip} onClick={() => escolherOrcamento(v)}>
                  Até {fmt(v).replace(',00', '')}
                </button>
              ))}
            </div>
            <form className={styles.outro} onSubmit={usarOutro}>
              <label htmlFor="montakit-outro">Outro valor</label>
              <input
                id="montakit-outro"
                inputMode="decimal"
                placeholder="R$ 50"
                value={outro}
                onChange={(e) => setOutro(e.target.value)}
              />
              <button type="submit">Seguir</button>
            </form>
          </>
        )}

        {etapa === 'itens' && orcamento !== null && (
          <>
            <h2 className={styles.titulo} id="montakit-titulo">
              O que <em>não pode faltar</em>?
            </h2>
            <p className={styles.pergunta}>
              Até {fmt(orcamento)} · marque quantos quiser, ou siga direto se tanto faz.
            </p>
            <div className={styles.chips}>
              {ITENS_DESEJADOS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`${styles.chip} ${desejados.includes(item.id) ? styles.chipAtivo : ''}`}
                  aria-pressed={desejados.includes(item.id)}
                  onClick={() => alternar(item.id)}
                >
                  {item.rotulo}
                </button>
              ))}
            </div>
            <div className={styles.navegacao}>
              <button type="button" className={styles.voltar} onClick={() => setEtapa('orcamento')}>
                ← Voltar
              </button>
              <button type="button" className={styles.seguir} onClick={() => setEtapa('resultado')}>
                Ver meus kits
              </button>
            </div>
          </>
        )}

        {etapa === 'resultado' && sugestao && orcamento !== null && (
          <>
            <h2 className={styles.titulo} id="montakit-titulo">
              {sugestao.opcoes.length > 0 ? (
                <>
                  Separamos <em>{sugestao.opcoes.length === 1 ? 'um kit' : `${sugestao.opcoes.length} kits`}</em> para você.
                </>
              ) : (
                <>
                  Quase <em>lá</em>.
                </>
              )}
            </h2>
            <p className={styles.pergunta}>
              {sugestao.aproximado
                ? 'Nenhum kit traz tudo dentro desse valor. Estes são os que chegam mais perto:'
                : sugestao.opcoes.length > 0
                  ? `Kits exclusivos Alpha até ${fmt(orcamento)}, já na embalagem pronta para levar.`
                  : `Nenhum kit cabe em ${fmt(orcamento)}${desejados.length ? ' com esses itens' : ''}.`}
            </p>

            {sugestao.opcoes.length > 0 && (
              <ul className={styles.opcoes}>
                {sugestao.opcoes.map((k, i) => renderKit(k as Produto, ORDINAIS[i]))}
              </ul>
            )}

            {sugestao.subir && (
              <ul className={styles.opcoes}>
                {renderKit(
                  sugestao.subir as Produto,
                  sugestao.opcoes.length > 0
                    ? `Por mais ${fmt(precoDoKit(sugestao.subir) - orcamento)}`
                    : 'O mais em conta com tudo isso',
                  true
                )}
              </ul>
            )}

            <div className={styles.navegacao}>
              <button type="button" className={styles.voltar} onClick={() => setEtapa('itens')}>
                ← Mudar
              </button>
              <button type="button" className={styles.avulso} onClick={buscarAvulso}>
                Prefiro montar avulso
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
