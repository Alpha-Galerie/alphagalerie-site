import { useState } from 'react';
import { supabase } from '../lib/supabase';
import styles from './AviseKit.module.css';

/**
 * Kit esgotado: em vez do botão desativado, o cliente deixa o WhatsApp para
 * ser avisado na reposição. Vai para leads_whatsapp (origem "avise_kit", com o
 * nome do kit na anotação), que a retaguarda já lista.
 */
export default function AviseKit({ kit }: { kit: { id: number; nome: string } }) {
  const [aberto, setAberto] = useState(false);
  const [whats, setWhats] = useState('');
  const [enviado, setEnviado] = useState(false);
  const [erro, setErro] = useState(false);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    const digitos = whats.replace(/\D/g, '');
    if (digitos.length < 10) {
      setErro(true);
      return;
    }
    setErro(false);
    try {
      await supabase.from('leads_whatsapp').insert({
        whatsapp: whats.trim(),
        origem: 'avise_kit',
        anotacao: `Avisar quando voltar: ${kit.nome} (#${kit.id})`,
        ts: new Date().toISOString(),
        pagina: window.location.href,
      });
    } catch { /* o aviso é opcional: não trava o cliente */ }
    setEnviado(true);
  }

  if (enviado) {
    return <p className={styles.ok}>Pronto! Avisamos no seu WhatsApp quando o kit voltar.</p>;
  }

  if (!aberto) {
    return (
      <button type="button" className={styles.botao} onClick={() => setAberto(true)}>
        Me avise quando voltar
      </button>
    );
  }

  return (
    <form className={styles.form} onSubmit={enviar}>
      <label className={styles.rotulo} htmlFor={`avise-${kit.id}`}>Seu WhatsApp</label>
      <div className={styles.linha}>
        <input
          id={`avise-${kit.id}`}
          className={styles.campo}
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="(11) 90000-0000"
          value={whats}
          onChange={(e) => setWhats(e.target.value)}
          aria-invalid={erro}
        />
        <button type="submit" className={styles.enviar}>Avisar</button>
      </div>
      {erro && <p className={styles.erro}>Digite o WhatsApp com DDD.</p>}
    </form>
  );
}
