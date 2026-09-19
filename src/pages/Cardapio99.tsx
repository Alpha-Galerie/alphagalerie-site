import { useEffect, useMemo } from 'react';
import { useCardapio99 } from '../hooks/useCardapio99';
import { enderecoLinha, horarios, useLoja } from '../hooks/useLoja';
import { gerarCsvCardapio, itensSemFoto, totalDeItens } from '../lib/cardapio99';
import { formatCurrency } from '../lib/format';
import styles from './Cardapio99.module.css';

const TITULO = 'Cardápio Alpha Galerie — Delivery';

/**
 * Cardápio enxuto para o cadastro no 99 Food.
 *
 * O link da loja inteira foi reprovado: o catálogo tem bong, cachimbo, CBD e
 * afins, que o marketplace não aceita. Esta página mostra só o que pode ser
 * vendido por lá, num formato de cardápio — dá para mandar o link, imprimir
 * em PDF ou baixar a planilha para subir no cadastro.
 */
export default function Cardapio99() {
  const { data: secoes, isLoading, isError } = useCardapio99();
  const loja = useLoja();

  useEffect(() => {
    const tituloAnterior = document.title;
    document.title = TITULO;
    document.body.classList.add('cardapio-claro');

    // Cardápio de marketplace não é página de loja: fora do índice do Google
    // para não competir com as páginas de produto nem virar porta de entrada.
    const meta = document.createElement('meta');
    meta.setAttribute('name', 'robots');
    meta.setAttribute('content', 'noindex, nofollow');
    document.head.appendChild(meta);

    return () => {
      document.title = tituloAnterior;
      document.body.classList.remove('cardapio-claro');
      meta.remove();
    };
  }, []);

  const total = useMemo(() => (secoes ? totalDeItens(secoes) : 0), [secoes]);
  const semFoto = useMemo(() => (secoes ? itensSemFoto(secoes) : 0), [secoes]);

  function baixarPlanilha() {
    if (!secoes) return;
    const blob = new Blob([gerarCsvCardapio(secoes)], {
      type: 'text/csv;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'cardapio-alpha-galerie-99food.csv';
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className={styles.pagina}>
      <header className={styles.cabecalho}>
        <img src="/logo.svg" alt="Alpha Galerie" className={styles.logo} />
        <h1 className={styles.titulo}>Cardápio · Delivery</h1>
        <p className={styles.endereco}>{enderecoLinha(loja)}</p>
        <p className={styles.contato}>
          {loja.telefone}
          {loja.email ? ` · ${loja.email}` : ''}
        </p>
        <p className={styles.horario}>
          {horarios(loja)
            .map((h) => `${h.dias}: ${h.horas}`)
            .join(' · ')}
        </p>
      </header>

      <div className={styles.acoes}>
        <button type="button" onClick={() => globalThis.print()} className={styles.botao}>
          Imprimir / salvar em PDF
        </button>
        <button
          type="button"
          onClick={baixarPlanilha}
          className={styles.botao}
          disabled={!secoes || total === 0}
        >
          Baixar planilha (CSV)
        </button>
      </div>

      {semFoto > 0 && (
        <p className={styles.nota}>
          {semFoto} {semFoto === 1 ? 'item precisa' : 'itens precisam'} de foto enviada à mão no
          cadastro: a imagem está salva dentro do banco, sem link que o app consiga baixar.
        </p>
      )}

      {isLoading && <p className={styles.aviso}>Carregando o cardápio…</p>}
      {isError && (
        <p className={styles.aviso}>
          Não foi possível carregar o cardápio agora. Atualize a página em alguns instantes.
        </p>
      )}

      {secoes?.map((secao) => (
        <section key={secao.titulo} className={styles.secao}>
          <h2 className={styles.secaoTitulo}>
            {secao.titulo}
            <span className={styles.secaoQtd}>{secao.itens.length}</span>
          </h2>
          <ul className={styles.itens}>
            {secao.itens.map((item) => (
              <li key={item.id} className={styles.item}>
                {item.imagem ? (
                  <img
                    src={item.imagem}
                    alt=""
                    className={styles.foto}
                    loading="lazy"
                    width={56}
                    height={56}
                  />
                ) : (
                  <span className={styles.fotoVazia} aria-hidden="true" />
                )}
                <span className={styles.descricao}>
                  <strong className={styles.itemNome}>{item.nome}</strong>
                  <span className={styles.itemDetalhe}>{item.descricao}</span>
                </span>
                <span className={styles.preco}>{formatCurrency(item.preco)}</span>
              </li>
            ))}
          </ul>
        </section>
      ))}

      <footer className={styles.rodape}>
        <p>
          <strong>{total}</strong> itens · preços em reais, sujeitos a alteração sem aviso.
        </p>
        <p>
          Venda proibida para menores de 18 anos. Bebida alcoólica e produtos derivados do
          tabaco são entregues somente mediante apresentação de documento com foto.
        </p>
        <p>Alpha Galerie · alphagalerie.com</p>
      </footer>
    </main>
  );
}
