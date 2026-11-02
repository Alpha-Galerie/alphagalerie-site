import { useEffect, useRef, useState } from 'react';
import { gerarPayloadPix } from '../../lib/pix';
import { formatCurrency } from '../../lib/format';
import { linkWhatsApp } from '../../lib/operador';
import s from '../../pages/Operador.module.css';

interface Props {
  valor: number;
  /** Número do pedido: vai como identificador do Pix. */
  txid: string;
  telefone: string;
  /** Monta a mensagem do WhatsApp com o Pix copia e cola. */
  mensagem: (pixCopiaECola: string) => string;
}

/**
 * Cobrança do pedido manual: QR e copia e cola na chave Pix da loja, e a
 * mensagem pronta para o WhatsApp do cliente. Quem confirma o pagamento é
 * o dono, na retaguarda — aí o pedido aparece em "A separar".
 */
export default function PixCobranca({ valor, txid, telefone, mensagem }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [copiado, setCopiado] = useState<'pix' | 'msg' | null>(null);
  const payload = gerarPayloadPix(valor, txid.replace(/\W/g, ''));
  const texto = mensagem(payload);

  useEffect(() => {
    let cancelado = false;
    (async () => {
      try {
        const QRCode = await import('qrcode');
        if (!cancelado && canvasRef.current) {
          await QRCode.toCanvas(canvasRef.current, payload, { width: 200, margin: 1 });
        }
      } catch {
        // Sem QR, o copia e cola continua funcionando.
      }
    })();
    return () => {
      cancelado = true;
    };
  }, [payload]);

  async function copiar(qual: 'pix' | 'msg') {
    try {
      await navigator.clipboard.writeText(qual === 'pix' ? payload : texto);
      setCopiado(qual);
      setTimeout(() => setCopiado(null), 2000);
    } catch {
      // Navegador sem permissão de área de transferência: o texto está na tela.
    }
  }

  return (
    <div className={s.pix}>
      <div className={s.totalFinal} style={{ width: '100%' }}>
        <span>Total no Pix</span>
        <span>{formatCurrency(valor)}</span>
      </div>
      <canvas ref={canvasRef} className={s.pixCanvas} aria-label="QR Code do Pix" />
      <div className={s.pixCodigo}>{payload}</div>
      <div className={s.pixAcoes}>
        <a className={s.botao} href={linkWhatsApp(telefone, texto)} target="_blank" rel="noopener noreferrer">
          Enviar no WhatsApp
        </a>
        <button type="button" className={s.botaoSec} onClick={() => copiar('msg')}>
          {copiado === 'msg' ? 'Mensagem copiada' : 'Copiar mensagem'}
        </button>
        <button type="button" className={s.botaoSec} onClick={() => copiar('pix')}>
          {copiado === 'pix' ? 'Pix copiado' : 'Copiar só o Pix'}
        </button>
      </div>
      <p className={s.aviso}>
        O pedido fica em “Aguardando Pix”. Quando o pagamento for confirmado, ele aparece em “A separar”.
      </p>
    </div>
  );
}
