import { useState } from 'react';
import { useCashbackRegras } from '../hooks/useCashback';
import {
  consultarCashback,
  descreverPercentual,
  formatarDia,
  whatsappValido,
  type CashbackSaldo,
} from '../lib/cashback';
import { formatCurrency, formatPhone } from '../lib/format';
import styles from './CashbackSection.module.css';

/**
 * Faixa do programa de cashback na home: explica a regra em uma linha e deixa
 * o cliente consultar o saldo pelo WhatsApp. Some se o programa estiver fora
 * do ar (migração não aplicada ou percentual zerado na retaguarda).
 */
export default function CashbackSection() {
  const regras = useCashbackRegras();
  const [whatsapp, setWhatsapp] = useState('');
  const [consultando, setConsultando] = useState(false);
  const [resultado, setResultado] = useState<CashbackSaldo | null | 'erro'>(null);

  if (!regras) return null;

  async function handleConsultar(e: React.FormEvent) {
    e.preventDefault();
    if (!whatsappValido(whatsapp) || consultando) return;
    setConsultando(true);
    const saldo = await consultarCashback(whatsapp);
    setConsultando(false);
    setResultado(saldo ?? 'erro');
  }

  return (
    <section className={styles.section} id="cashback" aria-label="Cashback Alpha">
      <div className={styles.inner}>
        <div className={styles.texto}>
          <p className={styles.eyebrow}>Cashback Alpha</p>
          <h2 className={styles.title}>
            Comprou, <em>ganhou</em>.
          </h2>
          <p className={styles.regra}>
            No site, {descreverPercentual(regras)} em crédito para a próxima compra.
            Vale por {regras.validadeDias} dias.
          </p>
          <ol className={styles.passos}>
            <li>Compre pelo site com seu WhatsApp.</li>
            <li>Pagamento confirmado, o cashback fica guardado no seu número.</li>
            <li>
              Na próxima compra, informe o mesmo WhatsApp: o saldo abate
              {regras.usoMaxPercentual < 100 ? ` até ${regras.usoMaxPercentual}% do pedido` : ' do pedido'}.
            </li>
          </ol>
        </div>

        <form className={styles.consulta} onSubmit={handleConsultar}>
          <label className={styles.label} htmlFor="cashback_whats">Consulte seu saldo</label>
          <div className={styles.linha}>
            <input
              id="cashback_whats"
              type="tel"
              inputMode="tel"
              className={styles.input}
              placeholder="(11) 99999-9999"
              value={whatsapp}
              onChange={(e) => {
                setWhatsapp(formatPhone(e.target.value));
                setResultado(null);
              }}
              autoComplete="tel"
            />
            <button
              type="submit"
              className={styles.btn}
              disabled={!whatsappValido(whatsapp) || consultando}
            >
              {consultando ? '...' : 'Ver saldo'}
            </button>
          </div>
          <p className={styles.resultado} aria-live="polite">
            {resultado === 'erro' && 'Não foi possível consultar agora. Tente de novo em instantes.'}
            {resultado !== null && resultado !== 'erro' && (
              resultado.saldo > 0 ? (
                <>
                  Você tem <strong>{formatCurrency(resultado.saldo)}</strong> de cashback
                  {resultado.proximoVencimento && (
                    <> · {formatCurrency(resultado.valorVencendo)} vence {formatarDia(resultado.proximoVencimento)}</>
                  )}
                  . <a href="#produtos">Usar agora →</a>
                </>
              ) : (
                <>Ainda sem saldo. Sua primeira compra já gera cashback. <a href="#produtos">Ver a vitrine →</a></>
              )
            )}
          </p>
        </form>
      </div>
    </section>
  );
}
