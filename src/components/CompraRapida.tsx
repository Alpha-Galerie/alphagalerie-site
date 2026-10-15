import { useEffect, useMemo, useState } from 'react';
import { entregaCompraRapida } from '../lib/frete';
import { gerarPayloadPix } from '../lib/pix';
import styles from './CompraRapida.module.css';

const WHATSAPP_NUMBER = import.meta.env.VITE_WHATSAPP_NUMBER as string;

export interface KitCompraRapida {
  /** "Session Nº02 Kraft" */
  nome: string;
  itens: string[];
  foto: string;
  preco: number;
}

interface Props {
  kit: KitCompraRapida;
  onClose: () => void;
}

function brl(valor: number): string {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/**
 * Compra em 3 passos, sem carrinho nem cadastro: paga o Pix (kit + entrega),
 * diz onde está e manda tudo no WhatsApp da loja. Feita para quem está no
 * bar ou no show e quer resolver em um minuto.
 */
export default function CompraRapida({ kit, onClose }: Props) {
  const [regiao, setRegiao] = useState<'alphaville' | 'outra'>('alphaville');
  const [copiado, setCopiado] = useState(false);
  const [nome, setNome] = useState('');
  const [endereco, setEndereco] = useState('');
  const [obs, setObs] = useState('');
  const [local, setLocal] = useState<string | null>(null);
  const [localStatus, setLocalStatus] = useState<'' | 'buscando' | 'erro'>('');

  const entrega = useMemo(() => entregaCompraRapida(), []);
  const freteValor = regiao === 'alphaville' ? entrega.valor : 0;
  const total = kit.preco + freteValor;
  const txid = useMemo(() => `SESSION${Date.now().toString(36).toUpperCase()}`, []);
  const pix = useMemo(() => gerarPayloadPix(total, txid), [total, txid]);
  const podeEnviar = endereco.trim().length > 3 || local !== null;

  useEffect(() => {
    const anterior = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = anterior;
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  async function copiarPix() {
    try {
      await navigator.clipboard.writeText(pix);
    } catch {
      // Navegador sem clipboard: o código fica selecionável na tela.
    }
    setCopiado(true);
  }

  function usarLocalizacao() {
    if (!navigator.geolocation) {
      setLocalStatus('erro');
      return;
    }
    setLocalStatus('buscando');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setLocal(`https://maps.google.com/?q=${latitude.toFixed(6)},${longitude.toFixed(6)}`);
        setLocalStatus('');
      },
      () => setLocalStatus('erro'),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  function enviarWhatsApp() {
    const pagamento =
      regiao === 'alphaville'
        ? `💸 Paguei no Pix: *${brl(total)}* (kit ${brl(kit.preco)} + entrega ${brl(freteValor)} · ${entrega.label})`
        : `💸 Paguei no Pix: *${brl(total)}* (só o kit; estou fora de Alphaville/Barueri, combinar a entrega)`;
    const entregaEm = [
      nome.trim() && `👤 ${nome.trim()}`,
      endereco.trim() && `📍 ${endereco.trim()}`,
      local && `🗺️ Minha localização: ${local}`,
      obs.trim() && `📝 ${obs.trim()}`,
    ].filter(Boolean).join('\n');
    const texto = [
      `🔥 *Pedido ${kit.nome}*\n${kit.itens.join(' + ')} + embalagem exclusiva`,
      pagamento,
      entregaEm,
      'Vou mandar o comprovante aqui.',
    ].join('\n\n');
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(texto)}`, '_blank', 'noopener');
  }

  return (
    <div className={styles.fundo} onClick={onClose}>
      <div className={styles.caixa} role="dialog" aria-modal="true" aria-label={`Comprar ${kit.nome}`} onClick={(e) => e.stopPropagation()}>
        <button type="button" className={styles.fechar} onClick={onClose} aria-label="Fechar">×</button>

        <div className={styles.topo}>
          <img src={kit.foto} alt="" className={styles.foto} />
          <div>
            <p className={styles.nome}>{kit.nome}</p>
            <p className={styles.itens}>{kit.itens.join(' · ')} · embalagem exclusiva</p>
          </div>
        </div>

        <div className={styles.regiao} role="radiogroup" aria-label="Onde você está">
          <button type="button" role="radio" aria-checked={regiao === 'alphaville'} className={regiao === 'alphaville' ? styles.chipAtivo : styles.chip} onClick={() => setRegiao('alphaville')}>
            Alphaville / Barueri
          </button>
          <button type="button" role="radio" aria-checked={regiao === 'outra'} className={regiao === 'outra' ? styles.chipAtivo : styles.chip} onClick={() => setRegiao('outra')}>
            Outro lugar
          </button>
        </div>

        <dl className={styles.conta}>
          <div><dt>Kit</dt><dd>{brl(kit.preco)}</dd></div>
          {regiao === 'alphaville' ? (
            <div><dt>Entrega · {entrega.label}</dt><dd>{brl(freteValor)}</dd></div>
          ) : (
            <div><dt>Entrega</dt><dd className={styles.combinar}>combinamos no WhatsApp</dd></div>
          )}
          <div className={styles.total}><dt>Total no Pix</dt><dd>{brl(total)}</dd></div>
        </dl>

        <section className={styles.passo}>
          <p className={styles.passoNum}>1 · Paga no Pix</p>
          <button type="button" className={copiado ? styles.btnCopiado : styles.btn} onClick={copiarPix}>
            {copiado ? 'Pix copiado ✓ cola no app do banco' : `Copiar Pix · ${brl(total)}`}
          </button>
          <code className={styles.codigo}>{pix}</code>
        </section>

        <section className={styles.passo}>
          <p className={styles.passoNum}>2 · Onde a gente entrega?</p>
          <button type="button" className={styles.btnLocal} onClick={usarLocalizacao}>
            {local ? '📍 Localização pronta ✓' : localStatus === 'buscando' ? 'Buscando sua localização…' : '📍 Usar minha localização'}
          </button>
          {localStatus === 'erro' && <p className={styles.erro}>Não deu para pegar a localização. Digite o endereço.</p>}
          <input className={styles.input} value={endereco} onChange={(e) => setEndereco(e.target.value)} placeholder="Endereço ou CEP" autoComplete="street-address" />
          <input className={styles.input} value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Observação · ex.: estou no Bar do Zé, mesa 12" />
          <input className={styles.input} value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Seu nome" autoComplete="given-name" />
        </section>

        <section className={styles.passo}>
          <p className={styles.passoNum}>3 · Manda pra gente</p>
          <button type="button" className={styles.btnZap} onClick={enviarWhatsApp} disabled={!podeEnviar}>
            Já paguei · enviar no WhatsApp
          </button>
          {!podeEnviar && <p className={styles.dica}>Coloca o endereço ou a localização para liberar.</p>}
        </section>

        <p className={styles.aviso}>Venda proibida para menores de 18 anos.</p>
      </div>
    </div>
  );
}
