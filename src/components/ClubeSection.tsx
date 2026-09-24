import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useClubeRegras } from '../hooks/useClube';
import {
  consultarClube,
  custoCupom,
  descreverRegra,
  formatarDataBanco,
  formatarDia,
  formatarPontos,
  formatarReais,
  percentualDeVolta,
  resgatarCupom,
  valorDosPontos,
  whatsappValido,
  type ClubeSaldo,
} from '../lib/clube';
import { formatPhone } from '../lib/format';
import styles from './ClubeSection.module.css';

/**
 * Alpha Club na home: os benefícios em cartões, a consulta de pontos pelo
 * WhatsApp e a troca de pontos por cupom. Some quando o programa está
 * desligado na retaguarda (ou o banco ainda não tem o clube).
 */
export default function ClubeSection() {
  const regras = useClubeRegras();
  const [whatsapp, setWhatsapp] = useState('');
  const [consultando, setConsultando] = useState(false);
  const [saldo, setSaldo] = useState<ClubeSaldo | null | 'erro'>(null);
  const [trocando, setTrocando] = useState<number | null>(null);
  const [aviso, setAviso] = useState<{ ok: boolean; texto: string } | null>(null);
  const [copiado, setCopiado] = useState('');

  if (!regras?.ativo) return null;
  const clube = regras;

  async function consultar() {
    const s = await consultarClube(whatsapp);
    setSaldo(s ?? 'erro');
  }

  async function handleConsultar(e: React.FormEvent) {
    e.preventDefault();
    if (!whatsappValido(whatsapp) || consultando) return;
    setConsultando(true);
    setAviso(null);
    await consultar();
    setConsultando(false);
  }

  async function handleTrocar(valor: number) {
    const custo = custoCupom(valor, clube);
    if (!window.confirm(`Trocar ${formatarPontos(custo)} por um cupom de ${formatarReais(valor)}?`)) return;
    setTrocando(valor);
    setAviso(null);
    const r = await resgatarCupom(whatsapp, valor);
    setTrocando(null);
    if (!r.ok) {
      setAviso({ ok: false, texto: r.erro });
      return;
    }
    setAviso({
      ok: true,
      texto: `Pronto! Cupom ${r.cupom.codigo} de ${formatarReais(r.cupom.valor)} criado. Use no checkout com este WhatsApp.`,
    });
    await consultar();
  }

  async function copiar(codigo: string) {
    try {
      await navigator.clipboard.writeText(codigo);
      setCopiado(codigo);
      setTimeout(() => setCopiado(''), 2000);
    } catch {
      // sem permissão de área de transferência: o código está na tela
    }
  }

  const volta = percentualDeVolta(clube).toLocaleString('pt-BR');
  const beneficios = [
    { icone: '💸', titulo: `${volta}% de volta`, texto: `${descreverRegra(clube)}. Vale em toda compra no site.` },
    clube.bonusBoasVindas > 0 && {
      icone: '🎉', titulo: 'Boas-vindas',
      texto: `${formatarPontos(clube.bonusBoasVindas)} na sua primeira compra.`,
    },
    clube.bonusAniversario > 0 && {
      icone: '🎂', titulo: 'Aniversário',
      texto: `${formatarPontos(clube.bonusAniversario)} (${formatarReais(valorDosPontos(clube.bonusAniversario, clube))}) no mês do seu aniversário.`,
    },
    clube.bonusIndicacao > 0 && {
      icone: '🤝', titulo: 'Indique e ganhe',
      texto: `${formatarPontos(clube.bonusIndicacao)} (${formatarReais(valorDosPontos(clube.bonusIndicacao, clube))}) quando um amigo novo faz a primeira compra.`,
    },
  ].filter(Boolean) as Array<{ icone: string; titulo: string; texto: string }>;

  const s = saldo !== null && saldo !== 'erro' ? saldo : null;

  return (
    <section className={styles.section} id="clube" aria-label={clube.nome}>
      <div className={styles.inner}>
        <div className={styles.texto}>
          <p className={styles.eyebrow}>{clube.nome} · cashback e fidelidade</p>
          <h2 className={styles.title}>
            Comprou, <em>pontuou</em>.
          </h2>
          <p className={styles.regra}>
            Cada compra no site vira pontos, e os pontos viram desconto. Cada lote vale
            {' '}{clube.validadeDias} dias.
          </p>

          <ul className={styles.beneficios}>
            {beneficios.map((b) => (
              <li key={b.titulo}>
                <span className={styles.icone} aria-hidden="true">{b.icone}</span>
                <strong>{b.titulo}</strong>
                <span>{b.texto}</span>
              </li>
            ))}
          </ul>

          <p className={styles.uso}>
            <strong>Como usar:</strong> no checkout, os pontos pagam até {clube.checkoutMaxPercentual}% dos
            produtos fora de promoção. Ou troque por cupom
            {clube.cupomValores.length > 0 && (
              <> ({clube.cupomValores.map((v) => `${formatarReais(v)} = ${formatarPontos(custoCupom(v, clube))}`).join(' · ')})</>
            )}
            , válido por {clube.cupomValidadeDias} dias.{' '}
            <Link to="/alpha-club" className={styles.link}>Regulamento completo →</Link>
          </p>
        </div>

        <div className={styles.consulta}>
          <form onSubmit={handleConsultar}>
            <label className={styles.label} htmlFor="clube_whats">Consulte seus pontos</label>
            <div className={styles.linha}>
              <input
                id="clube_whats"
                type="tel"
                inputMode="tel"
                className={styles.input}
                placeholder="(11) 99999-9999"
                value={whatsapp}
                onChange={(e) => {
                  setWhatsapp(formatPhone(e.target.value));
                  setSaldo(null);
                  setAviso(null);
                }}
                autoComplete="tel"
              />
              <button type="submit" className={styles.btn} disabled={!whatsappValido(whatsapp) || consultando}>
                {consultando ? '...' : 'Ver pontos'}
              </button>
            </div>
          </form>

          <div className={styles.resultado} aria-live="polite">
            {saldo === 'erro' && <p>Não foi possível consultar agora. Tente de novo em instantes.</p>}

            {s && !s.participante && s.pontos === 0 && (
              <p>
                Você ainda não é do {clube.nome}. Sua primeira compra já entra
                {clube.bonusBoasVindas > 0 && <>, com <strong>{formatarPontos(clube.bonusBoasVindas)}</strong> de boas-vindas</>}.
                {' '}<a href="#produtos">Ver a vitrine →</a>
              </p>
            )}

            {s && (s.participante || s.pontos > 0) && (
              <>
                <p className={styles.saldo}>
                  <strong>{formatarPontos(s.pontos)}</strong>
                  <span> = {formatarReais(s.valor)}</span>
                </p>
                {s.proximoVencimento && s.pontosVencendo > 0 && (
                  <p className={styles.nota}>
                    {formatarPontos(s.pontosVencendo)} vencem em {formatarDia(s.proximoVencimento)}.
                  </p>
                )}
                {s.aniversarioPontos > 0 && (
                  <p className={styles.festa}>🎂 Feliz aniversário! Entraram {formatarPontos(s.aniversarioPontos)} de presente.</p>
                )}

                {clube.cupomValores.length > 0 && (
                  <div className={styles.trocas}>
                    <p className={styles.label}>Trocar por cupom</p>
                    <div className={styles.trocasLista}>
                      {clube.cupomValores.map((v) => {
                        const custo = custoCupom(v, clube);
                        const pode = s.participante && s.pontos >= custo;
                        return (
                          <button
                            key={v}
                            type="button"
                            className={styles.troca}
                            disabled={!pode || trocando !== null}
                            onClick={() => handleTrocar(v)}
                            title={pode ? '' : `Faltam ${formatarPontos(Math.max(0, custo - s.pontos))}`}
                          >
                            <strong>{formatarReais(v)}</strong>
                            <span>{trocando === v ? 'trocando...' : formatarPontos(custo)}</span>
                          </button>
                        );
                      })}
                    </div>
                    <p className={styles.nota}>
                      Cupom de uso único, vale {clube.cupomValidadeDias} dias, para carrinho a partir de
                      {' '}{clube.cupomMinimoMultiplicador.toLocaleString('pt-BR')}× o valor do cupom.
                    </p>
                  </div>
                )}

                {s.cupons.length > 0 && (
                  <div className={styles.cupons}>
                    <p className={styles.label}>Seus cupons</p>
                    {s.cupons.map((c) => (
                      <div key={c.codigo} className={styles.cupom}>
                        <div>
                          <code>{c.codigo}</code>
                          <span>
                            {formatarReais(c.valor)} · carrinho a partir de {formatarReais(c.valorMinimo)}
                            {c.validade && <> · até {formatarDataBanco(c.validade)}</>}
                          </span>
                        </div>
                        <button type="button" className={styles.copiar} onClick={() => copiar(c.codigo)}>
                          {copiado === c.codigo ? 'Copiado!' : 'Copiar'}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {aviso && <p className={aviso.ok ? styles.ok : styles.erro}>{aviso.texto}</p>}
          </div>
        </div>
      </div>
    </section>
  );
}
