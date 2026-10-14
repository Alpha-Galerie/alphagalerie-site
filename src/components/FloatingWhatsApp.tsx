import { useEffect, useRef, useState, type FC } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { EVENTO_BUSCOU } from '../lib/interesse';
import { getPrecoInfo } from '../lib/preco';
import { formatCurrency } from '../lib/format';
import { buildProductPath } from '../lib/productPath';
import type { Produto } from '../types';
import styles from './FloatingWhatsApp.module.css';

const WHATSAPP_NUMBER = import.meta.env.VITE_WHATSAPP_NUMBER as string;

function linkWhatsApp(texto: string): string {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(texto)}`;
}

const TEXTO_PADRAO = 'Olá! Vim pelo site da Alpha Galerie.';

// Depois de uma busca, o balão espera um pouco: a pessoa ainda está olhando
// o resultado. Aparece no máximo duas vezes por visita, uma por termo.
const ESPERA_MS = 3500;
const MAX_POR_VISITA = 2;
const CHAVE_VISTOS = 'ag_assistente';

type Oferta = Pick<Produto, 'id' | 'nome' | 'preco' | 'preco_pix' | 'preco_promocional' | 'imagem_url'>;

function lerVistos(): string[] {
  try { return JSON.parse(sessionStorage.getItem(CHAVE_VISTOS) ?? '[]'); } catch { return []; }
}

function marcarVisto(termo: string) {
  try { sessionStorage.setItem(CHAVE_VISTOS, JSON.stringify([...lerVistos(), termo])); } catch { /* sem storage */ }
}

/** Os produtos em promoção primeiro; sem promoção, os em destaque. Só o
 *  que tem estoque: oferecer o que não dá para comprar frustra. */
async function buscarOfertas(termo: string): Promise<Oferta[]> {
  // Vírgula e parênteses quebram o filtro `or` do PostgREST.
  const t = termo.replace(/[^\p{L}\p{N} ]/gu, ' ').trim();
  if (t.length < 2) return [];
  const { data } = await supabase
    .from('produtos')
    .select('id,nome,preco,preco_pix,preco_promocional,imagem_url')
    .eq('ativo', true)
    .gt('estoque', 0)
    .or(`nome.ilike.%${t}%,subcategoria.ilike.%${t}%,marca.ilike.%${t}%`)
    .order('preco_promocional', { ascending: true, nullsFirst: false })
    .order('destaque', { ascending: false })
    .limit(3);
  return (data ?? []) as Oferta[];
}

const FloatingWhatsApp: FC = () => {
  const [termo, setTermo] = useState<string | null>(null);
  const [ofertas, setOfertas] = useState<Oferta[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function aoBuscar(e: Event) {
      const t = (e as CustomEvent<string>).detail.trim().toLowerCase();
      const vistos = lerVistos();
      if (vistos.length >= MAX_POR_VISITA || vistos.includes(t)) return;
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(async () => {
        const encontradas = await buscarOfertas(t);
        if (!encontradas.length) return;
        marcarVisto(t);
        setOfertas(encontradas);
        setTermo(t);
      }, ESPERA_MS);
    }
    window.addEventListener(EVENTO_BUSCOU, aoBuscar);
    return () => {
      window.removeEventListener(EVENTO_BUSCOU, aoBuscar);
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const fechar = () => setTermo(null);
  const textoWhats = termo
    ? `Olá! Estou procurando ${termo} no site da Alpha Galerie. Pode me ajudar a fechar o pedido?`
    : TEXTO_PADRAO;

  return (
    <div className={styles.wrapper}>
      {termo && (
        <div className={styles.balao} role="dialog" aria-labelledby="assistente-titulo">
          <button type="button" className={styles.fechar} onClick={fechar} aria-label="Fechar">×</button>
          <p className={styles.balaoTitulo} id="assistente-titulo">
            Procurando <em>{termo}</em>?
          </p>
          <p className={styles.balaoTexto}>Separei as ofertas. Quer ajuda para fechar o pedido?</p>
          <ul className={styles.ofertas}>
            {ofertas.map((o) => {
              const p = getPrecoInfo(o);
              return (
                <li key={o.id}>
                  <Link to={buildProductPath(o)} className={styles.oferta} onClick={fechar}>
                    {o.imagem_url
                      ? <img src={o.imagem_url} alt="" loading="lazy" />
                      : <span className={styles.semFoto} aria-hidden="true" />}
                    <span className={styles.ofertaNome}>{o.nome}</span>
                    <span className={styles.ofertaPreco}>
                      {p.desconto > 0 && <small>-{p.desconto}%</small>}
                      {formatCurrency(p.precoFinal)}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
          <a
            className={styles.balaoBotao}
            href={linkWhatsApp(textoWhats)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={fechar}
          >
            Falar no WhatsApp
          </a>
        </div>
      )}
      <a
        href={linkWhatsApp(textoWhats)}
        target="_blank"
        rel="noopener noreferrer"
        className={styles.link}
        aria-label="Falar pelo WhatsApp"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="#ffffff"
          aria-hidden="true"
        >
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
        </svg>
      </a>
    </div>
  );
};

export default FloatingWhatsApp;
