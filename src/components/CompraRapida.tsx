import { useEffect, useMemo, useState } from 'react';
import { opcoesEntregaRapida, type OndeEsta, type OpcaoEntrega } from '../lib/frete';
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

function soDigitos(txt: string): string {
  return txt.replace(/\D/g, '').slice(0, 8);
}

/**
 * Compra sem carrinho nem cadastro, para quem está no bar ou no show:
 * diz onde está (localização do celular ou CEP), escolhe moto, carro ou a
 * rota das 19h, paga kit + entrega num Pix só e manda o pedido pronto no
 * WhatsApp da loja.
 */
export default function CompraRapida({ kit, onClose }: Props) {
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [localStatus, setLocalStatus] = useState<'' | 'buscando' | 'erro'>('');
  const [cep, setCep] = useState('');
  const [escolhida, setEscolhida] = useState<OpcaoEntrega['id'] | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [nome, setNome] = useState('');
  const [endereco, setEndereco] = useState('');
  const [obs, setObs] = useState('');

  const onde: OndeEsta | null = coords ? { coords } : cep.length === 8 ? { cep } : null;
  const opcoes = onde ? opcoesEntregaRapida(onde) : [];
  const opcao = opcoes.find((o) => o.id === escolhida) ?? opcoes.find((o) => o.recomendada) ?? opcoes[0] ?? null;
  const combinar = onde !== null && opcoes.length === 0;
  const freteValor = opcao?.valor ?? 0;
  const total = kit.preco + freteValor;
  const txid = useMemo(() => `SESSION${Date.now().toString(36).toUpperCase()}`, []);
  const pix = useMemo(() => gerarPayloadPix(total, txid), [total, txid]);
  const podePagar = opcao !== null || combinar;
  const podeEnviar = podePagar && (coords !== null || endereco.trim().length > 3);

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

  // Mudou o lugar ou a entrega: o Pix copiado antes não vale mais.
  useEffect(() => setCopiado(false), [total]);

  function usarLocalizacao() {
    if (!navigator.geolocation) {
      setLocalStatus('erro');
      return;
    }
    setLocalStatus('buscando');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocalStatus('');
      },
      () => setLocalStatus('erro'),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  async function copiarPix() {
    try {
      await navigator.clipboard.writeText(pix);
    } catch {
      // Navegador sem clipboard: o código fica selecionável na tela.
    }
    setCopiado(true);
  }

  function enviarWhatsApp() {
    const pagamento = opcao
      ? `💸 Paguei no Pix: *${brl(total)}* (kit ${brl(kit.preco)} + ${opcao.titulo.toLowerCase()} ${brl(freteValor)})`
      : `💸 Paguei no Pix: *${brl(total)}* (só o kit; a entrega a gente combina aqui)`;
    const entregaEm = [
      nome.trim() && `👤 ${nome.trim()}`,
      endereco.trim() && `📍 ${endereco.trim()}`,
      !coords && cep.length === 8 && `CEP ${cep.slice(0, 5)}-${cep.slice(5)}`,
      coords && `🗺️ Localização: https://maps.google.com/?q=${coords.lat.toFixed(6)},${coords.lng.toFixed(6)}`,
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
            <p className={styles.precoKit}>{brl(kit.preco)}</p>
          </div>
        </div>

        <section className={styles.passo}>
          <p className={styles.passoNum}>1 · Onde você está?</p>
          <button type="button" className={coords ? styles.btnLocalOk : styles.btnLocal} onClick={usarLocalizacao}>
            {coords ? '📍 Localização pronta ✓' : localStatus === 'buscando' ? 'Buscando sua localização…' : '📍 Usar minha localização'}
          </button>
          {localStatus === 'erro' && <p className={styles.erro}>Não deu para pegar a localização. Digite o CEP.</p>}
          {!coords && (
            <input
              className={styles.input}
              value={cep.length > 5 ? `${cep.slice(0, 5)}-${cep.slice(5)}` : cep}
              onChange={(e) => setCep(soDigitos(e.target.value))}
              placeholder="ou digite o CEP"
              inputMode="numeric"
              autoComplete="postal-code"
              aria-label="CEP"
            />
          )}
        </section>

        {opcoes.length > 0 && (
          <section className={styles.passo}>
            <p className={styles.passoNum}>2 · Como chega</p>
            <div className={styles.opcoes} role="radiogroup" aria-label="Entrega">
              {opcoes.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  role="radio"
                  aria-checked={opcao?.id === o.id}
                  className={opcao?.id === o.id ? styles.opcaoAtiva : styles.opcao}
                  onClick={() => setEscolhida(o.id)}
                >
                  <span className={styles.opcaoTexto}>
                    <strong>{o.titulo}{o.recomendada && <em className={styles.recomendada}>recomendado</em>}</strong>
                    <small>{o.detalhe}</small>
                  </span>
                  <span className={styles.opcaoPreco}>{brl(o.valor)}</span>
                </button>
              ))}
            </div>
          </section>
        )}
        {combinar && (
          <p className={styles.combinarAviso}>
            Esse endereço é longe pra corrida na hora. Paga o kit e a gente combina a entrega no WhatsApp.
          </p>
        )}

        {podePagar && (
          <>
            <dl className={styles.conta}>
              <div><dt>Kit</dt><dd>{brl(kit.preco)}</dd></div>
              <div><dt>Entrega{opcao ? ` · ${opcao.titulo}` : ''}</dt><dd>{opcao ? brl(freteValor) : 'a combinar'}</dd></div>
              <div className={styles.total}><dt>Total no Pix</dt><dd>{brl(total)}</dd></div>
            </dl>

            <section className={styles.passo}>
              <p className={styles.passoNum}>3 · Paga no Pix</p>
              <button type="button" className={copiado ? styles.btnCopiado : styles.btn} onClick={copiarPix}>
                {copiado ? 'Pix copiado ✓ cola no app do banco' : `Copiar Pix · ${brl(total)}`}
              </button>
              <code className={styles.codigo}>{pix}</code>
            </section>

            <section className={styles.passo}>
              <p className={styles.passoNum}>4 · Manda pra gente</p>
              <input className={styles.input} value={endereco} onChange={(e) => setEndereco(e.target.value)} placeholder={coords ? 'Endereço (opcional, já temos a localização)' : 'Rua e número'} autoComplete="street-address" />
              <input className={styles.input} value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Observação · ex.: estou no Bar do Zé, mesa 12" />
              <input className={styles.input} value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Seu nome" autoComplete="given-name" />
              <button type="button" className={styles.btnZap} onClick={enviarWhatsApp} disabled={!podeEnviar}>
                Já paguei · enviar no WhatsApp
              </button>
              {!podeEnviar && <p className={styles.dica}>Coloca a rua e o número para liberar.</p>}
            </section>
          </>
        )}

        <p className={styles.aviso}>Valores de entrega estimados pela distância até a loja · venda proibida para menores de 18 anos.</p>
      </div>
    </div>
  );
}
