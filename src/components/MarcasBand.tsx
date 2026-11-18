import { MARCAS } from '../lib/marcas';
import styles from './MarcasBand.module.css';

export default function MarcasBand() {
  if (MARCAS.length === 0) return null;

  return (
    <section className={styles.secao} aria-labelledby="marcas-titulo">
      <div className={styles.head}>
        <p className={styles.eyebrow}>Marcas</p>
        <h2 className={styles.titulo} id="marcas-titulo">
          As melhores marcas você encontra <em>aqui</em>.
        </h2>
      </div>

      <div className={styles.assinatura}>
        {MARCAS.map((marca) => (
          <a key={marca.nome} href={marca.href} className={styles.link} aria-label={`Ver produtos ${marca.nome}`}>
            <img
              className={styles.logo}
              src={marca.src}
              alt={marca.nome}
              loading="lazy"
              decoding="async"
            />
          </a>
        ))}
      </div>
    </section>
  );
}
