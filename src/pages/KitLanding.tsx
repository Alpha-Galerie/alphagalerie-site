import { lazy, Suspense, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useKits } from '../hooks/useKits';
import { useVisita } from '../hooks/useVisita';
import { useCarrinhoActions } from '../hooks/useCarrinhoActions';
import { FILTROS_KIT, ehKitCase, kitNoFiltro, type FiltroKit } from '../lib/kits';
import { buildProductPath } from '../lib/productPath';
import { formatCurrency } from '../lib/format';
import {
  OG_IMAGEM_KITS,
  SITE_URL,
  aplicarSeo,
  definirJsonLd,
  restaurarSeoPadrao,
  resumirDescricao,
} from '../lib/seo';
import type { Produto, Variacao } from '../types';
import Header from '../components/Header';
import ProductCard from '../components/ProductCard';
import VariacoesModal from '../components/VariacoesModal';
import CartDrawer from '../components/CartDrawer';
import AddedToCartToast from '../components/AddedToCartToast';
import FloatingWhatsApp from '../components/FloatingWhatsApp';
import Footer from '../components/Footer';
import styles from './KitLanding.module.css';

/** Faixa de presente só na temporada de Black Friday e Natal (nov e dez até o dia 25). */
function temporadaDePresente(hoje = new Date()): boolean {
  const mes = hoje.getMonth();
  return mes === 10 || (mes === 11 && hoje.getDate() <= 25);
}

const CheckoutModal = lazy(() => import('../components/checkout/CheckoutModal'));

// O que o cliente vive hoje, sem o kit. Cada dor tem resposta nos benefícios.
const DORES = [
  'Chegar no rolê e perceber que a seda ficou em casa.',
  'Seda amassada no bolso, rasgando na hora de usar.',
  'A piteira que sumiu no fundo da mochila.',
  'Sair atrás de banca ou camelô para comprar o básico.',
  'Cada item comprado num lugar, tudo solto e desorganizado.',
];

const BENEFICIOS = [
  {
    icone: '◇',
    titulo: 'De quem vive a cultura',
    texto: 'Cada kit nasceu da experiência de quem usa. Nada genérico: só o que faz diferença na hora.',
  },
  {
    icone: '▭',
    titulo: 'Nunca mais na mão',
    texto: 'O essencial sempre junto, protegido e pronto para sair com você a qualquer momento.',
  },
  {
    icone: '✦',
    titulo: 'Único e inovador',
    texto: 'Ninguém no mercado faz um kit assim. Criado e desenvolvido pela Alpha Galerie.',
  },
  {
    icone: '◎',
    titulo: 'Assinatura Alpha Galerie',
    texto: 'Design próprio e inovador, desenvolvido para atender a real necessidade de quem usa.',
  },
];

/**
 * alphagalerie.com/kit — página de entrada do QR Code que vai nos kits
 * vendidos em bares e pontos parceiros. Apresenta os kits do dia a dia (na
 * embalagem exclusiva Alpha Galerie), vende pelo site e leva para a linha Case Alpha e
 * para a loja. Venda 100% online: o rodapé não mostra endereço da loja.
 */
export default function KitLanding() {
  useVisita({ pagina: 'kit', origemPadrao: 'QR Kit' });

  const { data: kits = [], isLoading } = useKits();
  const { adicionar, adicionarVariacao } = useCarrinhoActions();
  const [variacoesTarget, setVariacoesTarget] = useState<Produto | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  const [filtro, setFiltro] = useState<FiltroKit>('todos');
  const kitsDiaADia = kits.filter((k) => !ehKitCase(k));
  const kitsFiltrados = kitsDiaADia.filter((k) => kitNoFiltro(k, filtro));
  const kitsCase = kits.filter(ehKitCase);

  // Menor preço entre os kits do dia a dia disponíveis: vira "a partir de".
  const precosDisponiveis = kitsDiaADia
    .filter((k) => (k.estoque ?? 0) > 0)
    .map((k) => Number(k.preco_pix ?? k.preco))
    .filter((v) => v > 0);
  const aPartirDe = precosDisponiveis.length > 0 ? Math.min(...precosDisponiveis) : null;
  const precoChamada = aPartirDe !== null ? formatCurrency(aPartirDe).replace(',00', '') : null;

  // Título, descrição, canonical e prévia de compartilhamento da /kit (o build
  // grava o mesmo no HTML; aqui fica igual depois que a página carrega).
  useEffect(() => {
    aplicarSeo({
      titulo: 'Seda, piteira, isqueiro e tesoura em kits exclusivos | Alpha Galerie',
      descricao: resumirDescricao(
        `Seda, piteira, isqueiro, tesoura e dichavador em kits exclusivos Alpha Galerie${precoChamada ? ` a partir de ${precoChamada}` : ''}. Na embalagem exclusiva, só no site: compre online e receba em casa.`
      ),
      url: `${SITE_URL}/kit`,
      imagem: OG_IMAGEM_KITS,
      tipo: 'website',
    });
    if (kits.length > 0) {
      definirJsonLd('ld-kits', {
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        name: 'Kits Alpha',
        itemListElement: kits.map((k, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          url: `${SITE_URL}${buildProductPath(k)}`,
          name: k.nome,
        })),
      });
    }
  }, [kits, precoChamada]);

  useEffect(() => () => {
    restaurarSeoPadrao();
    definirJsonLd('ld-kits', null);
  }, []);

  function handleSelectVariacao(produto: Produto, variacao: Variacao) {
    adicionarVariacao(produto, variacao);
    setVariacoesTarget(null);
  }

  function renderCards(lista: Produto[]) {
    return lista.map((kit) => (
      <ProductCard
        key={kit.id}
        produto={kit}
        onAddToCart={adicionar}
        onOpenVariacoes={setVariacoesTarget}
        hideDestaqueBadge
      />
    ));
  }

  return (
    <>
      <Header onOpenCart={() => setCartOpen(true)} />

      <main id="main-content" className={styles.page}>
        <section className={styles.hero}>
          <div className={styles.heroFundo} aria-hidden="true">
            <span className={`${styles.brilho} ${styles.brilho1}`} />
            <span className={`${styles.brilho} ${styles.brilho2}`} />
            <span className={`${styles.brilho} ${styles.brilho3}`} />
            <span className={styles.selo}>ag</span>
            <span className={styles.grao} />
          </div>

          <div className={styles.heroConteudo}>
            <p className={`${styles.eyebrow} ${styles.entra}`}>✦ Kits Alpha Galerie</p>
            <h1 className={`${styles.titulo} ${styles.entra} ${styles.entra2}`}>
              Desenvolvido para <em>nunca mais te deixar na mão</em>.
            </h1>
            <ul className={`${styles.selos} ${styles.entra} ${styles.entra2}`} aria-label="Kit único, exclusivo e inovador">
              <li>Único</li>
              <li>Exclusivo</li>
              <li>Inovador</li>
            </ul>
            <p className={`${styles.lead} ${styles.entra} ${styles.entra3}`}>
              Criado por quem vive a cultura, feito para quem é da cultura. Tudo o que não pode
              faltar, com produtos selecionados. Ninguém no mercado faz um kit assim.
            </p>
            <a href="#kits" className={`${styles.ctaPrimario} ${styles.ctaBrilho} ${styles.entra} ${styles.entra4}`}>
              Escolha o seu kit
            </a>
            {precoChamada && (
              <p className={`${styles.aPartir} ${styles.entra} ${styles.entra4}`}>
                Kits a partir de <strong>{precoChamada}</strong> · receba em casa
              </p>
            )}
          </div>

          <div className={styles.faixa} aria-hidden="true">
            <div className={styles.faixaTrilho}>
              {Array.from({ length: 2 }).map((_, i) => (
                <span key={i}>
                  Kit único ✦ Exclusivo ✦ Inovador ✦ Só na Alpha Galerie ✦ Compre no site e receba em casa ✦&nbsp;
                </span>
              ))}
            </div>
          </div>
        </section>

        <section id="kits" className={styles.bloco}>
          <p className={styles.eyebrow}>Seda · Piteira · Isqueiro · Tesoura · Dichavador</p>
          <h2 className={styles.subtitulo}>Kits Alpha <em>exclusivos</em>.</h2>
          <p className={styles.texto}>
            Escolha o seu. <strong className={styles.destaque}>Compre no site e receba em casa.</strong>
          </p>
          {temporadaDePresente() && (
            <p className={styles.presente}>
              ✦ <strong>Presente pronto:</strong> o kit já vai na embalagem exclusiva Alpha Galerie.
              É só entregar.
            </p>
          )}
          {kitsDiaADia.length > 0 && (
            <div className={styles.filtros} role="group" aria-label="Filtrar kits">
              {FILTROS_KIT.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  className={filtro === f.id ? `${styles.filtro} ${styles.filtroAtivo}` : styles.filtro}
                  aria-pressed={filtro === f.id}
                  onClick={() => setFiltro(f.id)}
                >
                  {f.rotulo}
                </button>
              ))}
            </div>
          )}
          {isLoading ? (
            <p className={styles.texto}>Carregando os kits…</p>
          ) : kitsFiltrados.length > 0 ? (
            <div className={`products-grid-responsive ${styles.grid}`}>{renderCards(kitsFiltrados)}</div>
          ) : kitsDiaADia.length > 0 ? (
            <p className={styles.texto}>Nenhum kit nesse filtro agora.</p>
          ) : (
            <p className={styles.texto}>Novos kits chegando. Enquanto isso, veja a linha Case Alpha abaixo.</p>
          )}
        </section>

        <section className={`${styles.bloco} ${styles.pas}`} aria-label="Por que os Kits Alpha">
          <div className={styles.dores}>
            <h2 className={styles.subtitulo}>Você já <em>passou por isso</em>?</h2>
            <ul className={styles.listaDores}>
              {DORES.map((dor) => (
                <li key={dor}>
                  <span className={styles.dorIcone} aria-hidden="true">✕</span>
                  {dor}
                </li>
              ))}
            </ul>
          </div>

          <h2 className={styles.subtitulo}>Com o Kit Alpha, <em>isso acabou</em>.</h2>
          <p className={styles.texto}>Um kit que te entende, desenvolvido para atender a sua necessidade.</p>
          <div className={styles.beneficios}>
            {BENEFICIOS.map((b) => (
              <div key={b.titulo} className={styles.beneficio}>
                <span className={styles.beneficioIcone} aria-hidden="true">{b.icone}</span>
                <strong>{b.titulo}</strong>
                <span>{b.texto}</span>
              </div>
            ))}
          </div>
          <a href="#kits" className={`${styles.ctaPrimario} ${styles.ctaPas}`}>Quero o meu kit</a>
        </section>

        {kitsCase.length > 0 && (
          <section className={`${styles.bloco} ${styles.blocoCase}`}>
            <h2 className={styles.subtitulo}>Case Alpha 2.0, <em>o seu setup completo</em>.</h2>
            <p className={styles.texto}>
              Tabaco, sedas, piteira, tesoura e acessórios organizados no case rígido Alpha. Tudo
              o que você precisa, num só lugar, pronto para ir com você.
            </p>
            <div className={`products-grid-responsive ${styles.grid}`}>{renderCards(kitsCase)}</div>
          </section>
        )}

        <section className={`${styles.bloco} ${styles.parceiro}`} aria-label="Só no site da Alpha Galerie">
          <h2 className={styles.subtitulo}>Só existe <em>aqui</em>.</h2>
          <p className={styles.texto}>
            Os Kits Alpha não estão em marketplace nem em nenhuma outra loja. São desenvolvidos,
            montados e vendidos apenas pela Alpha Galerie, em lotes pequenos. Para ter o seu, só
            pelo nosso site.
          </p>
        </section>

        <section className={styles.fecho}>
          <h2 className={styles.subtitulo}>Quem entende, <em>já tem o seu</em>.</h2>
          <p className={styles.texto}>
            {precoChamada ? <>Kits a partir de <strong className={styles.destaque}>{precoChamada}</strong>. </> : null}
            Estoque limitado. Garanta o seu antes que acabe.
          </p>
          <a href="#kits" className={styles.ctaPrimario}>Adquira o seu agora</a>
          <p className={styles.linkLoja}>
            <Link to="/">Ou conheça a loja completa →</Link>
          </p>
        </section>
      </main>

      <Footer semEndereco />

      <VariacoesModal
        produto={variacoesTarget}
        onClose={() => setVariacoesTarget(null)}
        onSelect={handleSelectVariacao}
      />

      <CartDrawer
        isOpen={cartOpen}
        onClose={() => setCartOpen(false)}
        onOpenCheckout={() => {
          setCartOpen(false);
          setCheckoutOpen(true);
        }}
      />

      {checkoutOpen && (
        <Suspense fallback={null}>
          <CheckoutModal onClose={() => setCheckoutOpen(false)} />
        </Suspense>
      )}

      <FloatingWhatsApp />
      <AddedToCartToast onOpenCart={() => setCartOpen(true)} />
    </>
  );
}
