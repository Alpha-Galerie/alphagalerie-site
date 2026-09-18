import { useState } from 'react';
import { supabase } from '../lib/supabase';
import styles from './RecuperacaoPopup.module.css';

interface RecuperacaoPopupProps {
  onClose: () => void;
}

export default function RecuperacaoPopup({ onClose }: RecuperacaoPopupProps) {
  const [whats, setWhats] = useState('');
  const [whatsOk, setWhatsOk] = useState(false);

  function handleUsarCupom() {
    onClose();
    sessionStorage.setItem('ag_cupom_auto', 'ALPHA10');
    document.getElementById('produtos')?.scrollIntoView({ behavior: 'smooth' });
  }

  async function handleSalvarWhats() {
    const tel = whats.trim();
    if (!tel || tel.length < 8) return;
    try {
      await supabase.from('leads_whatsapp').insert({
        whatsapp: tel,
        origem: 'popup_recuperacao',
        cupom: 'ALPHA10',
        ts: new Date().toISOString(),
        pagina: window.location.href,
      });
    } catch { /* ignore */ }
    setWhatsOk(true);
  }

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-label="Oferta exclusiva">
      <div className={styles.box}>
        <button
          type="button"
          className={styles.closeBtn}
          onClick={onClose}
          aria-label="Fechar"
        >
          ×
        </button>

        <p className={styles.eyebrow}>Espera! Antes de ir embora...</p>

        <h2 className={styles.headline}>
          <em>10% OFF</em> na sua
          <br />primeira compra.
        </h2>

        <p className={styles.desc}>
          Use o cupom abaixo antes de sair e garanta o desconto:
        </p>

        <div className={styles.cupomBox}>
          <p className={styles.cupomLabel}>Seu cupom exclusivo</p>
          <p className={styles.cupomCode}>ALPHA10</p>
          <p className={styles.cupomValidity}>válido na primeira compra</p>
        </div>

        <button type="button" className={styles.ctaBtn} onClick={handleUsarCupom}>
          Ver vitrine e usar cupom →
        </button>

        <div className={styles.whatsSection}>
          <p className={styles.whatsLabel}>Quer receber promoções exclusivas?</p>
          <div className={styles.whatsRow}>
            <input
              type="tel"
              className={styles.whatsInput}
              placeholder="(11) 99999-9999"
              value={whats}
              onChange={(e) => setWhats(e.target.value)}
              disabled={whatsOk}
            />
            <button
              type="button"
              className={styles.whatsBtn}
              onClick={handleSalvarWhats}
              disabled={whatsOk}
            >
              Enviar
            </button>
          </div>
          {whatsOk && (
            <p className={styles.whatsSuccess}>
              ✓ Número salvo! Em breve entraremos em contato.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
