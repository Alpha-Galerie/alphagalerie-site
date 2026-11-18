import type { Marca } from '../lib/marcas';
import styles from './MarcaCabecalho.module.css';

/** Topo da vitrine de uma marca: logo oficial e uma frase curta. */
export default function MarcaCabecalho({ marca }: { marca: Marca }) {
  return (
    <div className={styles.cabecalho}>
      <img className={styles.logo} src={marca.src} alt={marca.nome} />
      {marca.frase && <p className={styles.frase}>{marca.frase}</p>}
    </div>
  );
}
