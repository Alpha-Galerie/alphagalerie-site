import { useEffect, useState } from 'react';
import { tempoRestante } from '../lib/campanha';
import styles from './BlackNovemberSection.module.css';

const dois = (n: number) => String(n).padStart(2, '0');

/** Relógio até o fim da campanha. Some quando acaba. */
export default function Contagem() {
  const [resto, setResto] = useState(() => tempoRestante());

  useEffect(() => {
    const t = setInterval(() => setResto(tempoRestante()), 1000);
    return () => clearInterval(t);
  }, []);

  if (!resto) return null;

  const partes = [
    { n: resto.dias, rotulo: 'dias' },
    { n: resto.horas, rotulo: 'h' },
    { n: resto.minutos, rotulo: 'min' },
    { n: resto.segundos, rotulo: 's' },
  ];

  return (
    <div className={styles.contagem} role="timer" aria-label="Tempo até o fim da Black November">
      <span className={styles.contagemRotulo}>Termina em</span>
      {partes.map((p) => (
        <span key={p.rotulo} className={styles.contagemBloco}>
          <strong>{dois(p.n)}</strong>
          <small>{p.rotulo}</small>
        </span>
      ))}
    </div>
  );
}
