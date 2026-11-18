import { abrirMontaKit } from '../lib/montaKit';
import styles from './MontaKit.module.css';

/** Botão que abre o assistente "Monte seu kit". `flutuante` fixa no canto da tela. */
export default function MontaKitBotao({ flutuante = false, texto = 'Monte seu kit' }: { flutuante?: boolean; texto?: string }) {
  return (
    <button
      type="button"
      className={`${styles.chamar} ${flutuante ? styles.flutuante : ''}`}
      onClick={abrirMontaKit}
    >
      <span aria-hidden="true">✦</span> {texto}
    </button>
  );
}
