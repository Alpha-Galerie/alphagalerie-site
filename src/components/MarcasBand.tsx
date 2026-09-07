import bannerArte from '../assets/banner-raw.jpg';
import styles from './MarcasBand.module.css';

// Basta soltar o arquivo do logo em src/assets/marcas/ que ele entra aqui sozinho.
// Use PNG com fundo transparente — a faixa é escura, logo com fundo branco fica feio.
const ARQUIVOS = import.meta.glob('../assets/marcas/*.{png,webp,svg}', {
  eager: true,
  import: 'default',
}) as Record<string, string>;

function nomeDaMarca(caminho: string): string {
  const arquivo = caminho.split('/').pop() ?? '';
  return arquivo.replace(/\.\w+$/, '').replace(/[-_]+/g, ' ').trim();
}

const MARCAS = Object.entries(ARQUIVOS)
  .map(([caminho, src]) => ({ nome: nomeDaMarca(caminho), src }))
  .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

export default function MarcasBand() {
  return (
    <section className={styles.secao} aria-labelledby="marcas-titulo">
      <div className={styles.banner}>
        <img
          className={styles.arte}
          src={bannerArte}
          alt=""
          aria-hidden="true"
          loading="lazy"
          decoding="async"
        />
        <div className={styles.veu} aria-hidden="true" />

        <div className={styles.conteudo}>
          <p className={styles.eyebrow}>Marcas</p>
          <h2 className={styles.titulo} id="marcas-titulo">
            As melhores marcas você encontra <em>aqui</em>.
          </h2>
          <p className={styles.texto}>
            Originais, escolhidas uma a uma. Nada de paralelo.
          </p>
          <a className={styles.cta} href="#produtos">
            Ver a vitrine
            <span aria-hidden="true">→</span>
          </a>
        </div>
      </div>

      {MARCAS.length > 0 && (
        <div className={styles.assinatura}>
          {MARCAS.map((marca) => (
            <img
              key={marca.nome}
              className={styles.logo}
              src={marca.src}
              alt={marca.nome}
              loading="lazy"
              decoding="async"
            />
          ))}
        </div>
      )}
    </section>
  );
}
