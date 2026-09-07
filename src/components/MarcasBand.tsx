import { useMarcas } from '../hooks/useMarcas';
import styles from './MarcasBand.module.css';

const MIN_PARA_EXIBIR = 4;
const SKELETON = Array.from({ length: 8 }, (_, i) => i);

export default function MarcasBand() {
  const { marcas, isLoading } = useMarcas();

  if (isLoading) {
    return (
      <section className={styles.band} aria-hidden="true">
        <div className={styles.head}>
          <p className={styles.eyebrow}>Marcas</p>
          <h2 className={styles.titulo}>
            As melhores marcas você encontra <em>aqui</em>.
          </h2>
        </div>
        <div className={styles.viewport}>
          <div className={styles.track}>
            {SKELETON.map((i) => (
              <span key={i} className={styles.placeholder} />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (marcas.length < MIN_PARA_EXIBIR) return null;

  // Duplicado para o loop do marquee ser contínuo; a cópia não é lida nem focável
  const trilha = [...marcas, ...marcas];

  return (
    <section className={styles.band} aria-labelledby="marcas-titulo">
      <div className={styles.head}>
        <p className={styles.eyebrow}>Marcas</p>
        <h2 className={styles.titulo} id="marcas-titulo">
          As melhores marcas você encontra <em>aqui</em>.
        </h2>
      </div>

      <div className={styles.viewport}>
        <div className={styles.track}>
          {trilha.map((marca, i) => {
            const copia = i >= marcas.length;
            return (
              <a
                key={`${marca}-${i}`}
                className={styles.marca}
                href={`/?q=${encodeURIComponent(marca)}`}
                aria-hidden={copia || undefined}
                tabIndex={copia ? -1 : undefined}
              >
                {marca}
              </a>
            );
          })}
        </div>
      </div>
    </section>
  );
}
