import { Component, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useCartStore } from '../../store/cart';
import { useCheckout } from '../../hooks/useCheckout';
import { loadMercadoPago } from '../../lib/mercadopago';
import { calcularEntregaProgramada, calcularFrete, PEX_CORTE_TEXTO } from '../../lib/frete';
import type { FreteResult } from '../../lib/frete';
import type { Pedido } from '../../types';
import PixPayment from './PixPayment';
import CardPayment from './CardPayment';
import { formatCurrency as fmt } from '../../lib/format';
import styles from './CheckoutModal.module.css';
import { supabase } from '../../lib/supabase';
import { checkoutProvider } from '../../lib/checkout';
import { useClubeRegras, useClubeSaldo } from '../../hooks/useClube';
import {
  aniversarioValido,
  formatarDataBanco,
  formatarDia,
  formatarPontos,
  mascararAniversario,
  pontosGanhos,
  pontosParaUsar,
  valorDosPontos,
  whatsappValido,
} from '../../lib/clube';

class CardErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '24px', color: '#888', fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: '0.1em' }}>
          Erro ao carregar formulário de cartão. Tente fechar e abrir novamente, ou escolha PIX.
        </div>
      );
    }
    return this.props.children;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CardPaymentSafe(props: { amount: number; mp: any; onTokenReceived: (token: string, paymentMethodId: string) => void; onError?: (msg: string) => void }) {
  return (
    <CardErrorBoundary>
      <CardPayment amount={props.amount} mp={props.mp} onTokenReceived={props.onTokenReceived} onError={props.onError} />
    </CardErrorBoundary>
  );
}

interface CheckoutModalProps {
  onClose: () => void;
}

type Step = 'form' | 'pix' | 'card' | 'success';

const FOCUSABLE = 'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

type CupomInfo = { tipo: 'pct' | 'fixo' | 'frete'; valor: number; descricao: string };
type CupomAplicado = CupomInfo & { codigo: string };

// Os cupons ficam na tabela `cupons` e são administrados pela retaguarda.
// Antes esta lista era fixa aqui no código, então qualquer cupom criado na
// retaguarda não existia para o cliente — ele digitava e recebia "inválido".
//
// A loja não lista a tabela: validar_cupom() é SECURITY DEFINER e devolve
// apenas o código consultado, e só quando ele está ativo, dentro da validade,
// do limite de usos e do valor mínimo. Assim ninguém descobre os códigos
// existentes lendo a chave pública.
//
// Cupom do Alpha Club é preso ao WhatsApp de quem trocou os pontos: por isso
// o número vai junto quando o banco já tem o clube (antes dele, a função só
// aceita código e subtotal).
async function buscarCupom(codigo: string, subtotal: number, whatsapp?: string | null): Promise<CupomAplicado | null> {
  const { data, error } = await supabase.rpc('validar_cupom', {
    p_codigo: codigo,
    p_subtotal: subtotal,
    ...(whatsapp != null ? { p_whatsapp: whatsapp } : {}),
  });
  if (error) {
    console.error('[CheckoutModal] erro ao validar cupom:', error);
    return null;
  }
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return null;
  return {
    codigo: row.codigo,
    tipo: row.tipo as CupomInfo['tipo'],
    valor: Number(row.valor) || 0,
    descricao: row.descricao || '',
  };
}

function maskTelefone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 10) {
    return digits.replace(/^(\d{2})(\d)/, '($1) $2').replace(/(\d{4})(\d)/, '$1-$2');
  }
  return digits.replace(/^(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d)/, '$1-$2');
}

// use shared cached formatter via `fmt`

export default function CheckoutModal({ onClose }: CheckoutModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const items = useCartStore((s) => s.items);
  const clearCart = useCartStore((s) => s.clear);
  const { submitPedido } = useCheckout();

  const [step, setStep] = useState<Step>('form');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cardProcessing, setCardProcessing] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [pedidoId, setPedidoId] = useState<number | null>(null);
  const [txid, setTxid] = useState('');
  const [submittedTotal, setSubmittedTotal] = useState<number | null>(null);
  const [pontosGanhoFinal, setPontosGanhoFinal] = useState(0);

  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [email, setEmail] = useState('');
  const [cep, setCep] = useState('');
  const [endereco, setEndereco] = useState('');
  const [numero, setNumero] = useState('');
  const [complemento, setComplemento] = useState('');
  const [bairro, setBairro] = useState('');
  const [cidade, setCidade] = useState('');
  const [pagamento, setPagamento] = useState<'pix' | 'cartao'>('pix');
  const [observacoes, setObservacoes] = useState('');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [mpInstance, setMpInstance] = useState<any>(null);

  const [cupomInput, setCupomInput] = useState('');
  const [cupomAtivo, setCupomAtivo] = useState<CupomAplicado | null>(null);
  const [cupomStatus, setCupomStatus] = useState<{ ok: boolean; msg: string } | null>(null);
  const [cupomLoading, setCupomLoading] = useState(false);
  const [cepStatus, setCepStatus] = useState<{ ok: boolean; msg: string } | null>(null);
  const [cepLoading, setCepLoading] = useState(false);
  const numeroRef = useRef<HTMLInputElement>(null);

  // Onde a Pex atende, o cliente escolhe: Entrega Programada (mais barata,
  // sai na coleta do meio-dia) ou motoboy. A programada vem marcada.
  const [modalidade, setModalidade] = useState<'programada' | 'motoboy'>('programada');
  const freteMotoboy = calcularFrete(cep, bairro);
  const programada = freteMotoboy.valor > 0 ? calcularEntregaProgramada(cep) : null;
  const usaProgramada = modalidade === 'programada' && programada !== null;
  const frete: FreteResult = usaProgramada ? programada : freteMotoboy;

  const subtotal = items.reduce((acc, i) => acc + i.preco * i.qtd, 0);
  const descontoPix = pagamento === 'pix' ? subtotal * 0.05 : 0;
  const freteValor = cupomAtivo?.tipo === 'frete' ? 0 : frete.valor;
  const descontoCupom = (() => {
    if (!cupomAtivo) return 0;
    if (cupomAtivo.tipo === 'pct') return (subtotal - descontoPix) * (cupomAtivo.valor / 100);
    if (cupomAtivo.tipo === 'fixo') return Math.min(cupomAtivo.valor, subtotal - descontoPix);
    return 0;
  })();
  const totalSemPontos = Math.max(0, subtotal - descontoPix - descontoCupom + freteValor);

  // Alpha Club: os pontos do WhatsApp digitado pagam até o teto do programa
  // sobre os produtos fora de promoção, e não somam com cupom. O banco refaz
  // a conta ao criar o pedido; aqui é só para o cliente ver antes.
  // `clube` null = banco sem o clube; `ativo` false = programa pausado.
  const clube = useClubeRegras();
  const clubeNoAr = clube?.ativo === true;
  const { saldo: clubeSaldo } = useClubeSaldo(telefone, clubeNoAr);
  const [usarPontos, setUsarPontos] = useState(true);
  const [aniversario, setAniversario] = useState('');
  const [indicadoPor, setIndicadoPor] = useState('');
  const valorElegivel = items
    .filter((i) => !i.promocional)
    .reduce((acc, i) => acc + i.preco * i.qtd, 0);
  const pontosDisponiveis =
    clubeNoAr && clube && clubeSaldo && !cupomAtivo
      ? pontosParaUsar(clubeSaldo.pontos, valorElegivel, clube)
      : { pontos: 0, desconto: 0 };
  const pontosUsados = usarPontos ? pontosDisponiveis : { pontos: 0, desconto: 0 };
  const total = Math.max(0, totalSemPontos - pontosUsados.desconto);
  const primeiraCompra = clubeNoAr && clubeSaldo !== null && !clubeSaldo.participante;
  const bonusBoasVindas = primeiraCompra && clube ? clube.bonusBoasVindas : 0;
  const pontosGanho = clubeNoAr && clube ? pontosGanhos(total - freteValor, clube) : 0;
  const displayTotal = submittedTotal ?? total;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const focusables = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE));
    if (focusables.length) focusables[0].focus();

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key === 'Tab') {
        if (!focusables.length) { e.preventDefault(); return; }
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey) {
          if (document.activeElement === first) { e.preventDefault(); last.focus(); }
        } else {
          if (document.activeElement === last) { e.preventDefault(); first.focus(); }
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  // Subtotal em ref para o cupom automático poder validar valor mínimo sem
  // reexecutar o efeito a cada mudança do carrinho.
  const subtotalRef = useRef(subtotal);
  useEffect(() => { subtotalRef.current = subtotal; }, [subtotal]);

  useEffect(() => {
    const auto = sessionStorage.getItem('ag_cupom_auto');
    if (!auto) return;
    sessionStorage.removeItem('ag_cupom_auto');
    const codigo = auto.trim().toUpperCase();
    let cancelado = false;
    buscarCupom(codigo, subtotalRef.current).then((cupom) => {
      if (cancelado || !cupom) return;
      setCupomInput(codigo);
      setCupomAtivo(cupom);
      setCupomStatus({ ok: true, msg: `✓ ${cupom.descricao} aplicado!` });
    });
    return () => { cancelado = true; };
  }, []);

  function handleCepChange(e: React.ChangeEvent<HTMLInputElement>) {
    let v = e.target.value.replace(/\D/g, '').slice(0, 8);
    if (v.length > 5) v = v.slice(0, 5) + '-' + v.slice(5);
    setCep(v);
    const digits = v.replace(/\D/g, '');
    if (digits.length === 8) buscarCep(digits);
  }

  async function buscarCep(digits: string) {
    setCepStatus({ ok: false, msg: 'Buscando...' });
    setCepLoading(true);
    try {
      const resp = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      const data = await resp.json();
      if (data.erro) {
        setCepStatus({ ok: false, msg: 'CEP não encontrado. Preencha manualmente.' });
        return;
      }
      if (data.logradouro) setEndereco(data.logradouro);
      if (data.bairro) setBairro(data.bairro);
      if (data.localidade) setCidade(data.localidade);
      setCepStatus({ ok: true, msg: '✓ Endereço encontrado' });
      setTimeout(() => numeroRef.current?.focus(), 50);
    } catch {
      setCepStatus({ ok: false, msg: 'Erro ao buscar CEP. Preencha manualmente.' });
    } finally {
      setCepLoading(false);
    }
  }

  async function handleAplicarCupom(codigoInformado?: string) {
    const codigo = (codigoInformado ?? cupomInput).trim().toUpperCase();
    if (codigoInformado) setCupomInput(codigo);
    if (!codigo) { setCupomAtivo(null); setCupomStatus(null); return; }
    if (cupomLoading) return;

    const cupomDoClube = codigo.startsWith('CLUBE-');
    if (cupomDoClube && !whatsappValido(telefone)) {
      setCupomAtivo(null);
      setCupomStatus({ ok: false, msg: '✗ Cupom do clube: preencha antes o WhatsApp que trocou os pontos' });
      return;
    }

    setCupomLoading(true);
    setCupomStatus({ ok: true, msg: 'Verificando...' });
    const cupom = await buscarCupom(codigo, subtotal, clube ? telefone : null);
    setCupomLoading(false);

    if (!cupom) {
      setCupomAtivo(null);
      setCupomStatus({
        ok: false,
        msg: cupomDoClube
          ? '✗ Cupom do clube inválido: confira o WhatsApp, a validade e o valor mínimo'
          : '✗ Cupom inválido ou expirado',
      });
    } else {
      setCupomAtivo(cupom);
      setCupomStatus({ ok: true, msg: `✓ ${cupom.descricao} aplicado!` });
    }
  }

  function getMpErrorMessage(reason: string): string {
    const messages: Record<string, string> = {
      cc_rejected_insufficient_amount: 'Saldo insuficiente no cartão.',
      cc_rejected_bad_filled_card_number: 'Número do cartão inválido.',
      cc_rejected_bad_filled_date: 'Data de validade inválida.',
      cc_rejected_bad_filled_security_code: 'CVV inválido.',
      cc_rejected_blacklist: 'Cartão não autorizado. Tente outro cartão.',
      cc_rejected_call_for_authorize: 'Cartão requer autorização do banco. Entre em contato com seu banco.',
    }
    return messages[reason] ?? 'Pagamento recusado. Verifique os dados ou tente outro cartão.'
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);

    // Validações explícitas
    if (!nome.trim()) {
      setSubmitError('Por favor, informe seu nome completo.');
      return;
    }
    if (telefone.replace(/\D/g, '').length < 10) {
      setSubmitError('Por favor, informe um WhatsApp válido com DDD.');
      return;
    }
    if (cep.replace(/\D/g, '').length < 8) {
      setSubmitError('Digite um CEP válido para calcular o frete.');
      return;
    }
    if (!endereco.trim()) {
      setSubmitError('Por favor, informe o endereço de entrega.');
      return;
    }

    if (pagamento === 'cartao' && !email.trim()) {
      setSubmitError('Informe seu e-mail para pagamento por cartão.');
      return;
    }

    if (clubeNoAr && aniversario.trim() && !aniversarioValido(aniversario)) {
      setSubmitError('Aniversário no formato dia/mês, por exemplo 15/03.');
      return;
    }
    if (clubeNoAr && indicadoPor.trim() && !whatsappValido(indicadoPor)) {
      setSubmitError('Confira o WhatsApp de quem te indicou (com DDD).');
      return;
    }

    setIsSubmitting(true);

    // Só rua e número: complemento, bairro, cidade e CEP vão nos próprios
    // campos e o useCheckout monta o texto. Antes iam nos dois lugares e o
    // endereço do pedido saía com tudo repetido.
    const ruaNumero = [endereco, numero].filter(Boolean).join(', ');
    // A loja vê nas observações que o pedido vai na coleta da Pex, e qual.
    // Recalcula na hora do envio: a tela pode ter aberto antes das 12h.
    const pex = usaProgramada ? calcularEntregaProgramada(cep) : null;
    const obsPedido = pex
      ? [pex.observacao, observacoes.trim()].filter(Boolean).join(' | ')
      : observacoes;

    const dadosPedido: Pedido = {
      nome, telefone,
      email: email || undefined,
      cep: cep || undefined,
      endereco: ruaNumero || undefined,
      bairro: bairro || undefined,
      cidade: cidade || undefined,
      complemento: complemento || undefined,
      pagamento, entrega: usaProgramada ? 'programada' : 'delivery',
      observacoes: obsPedido || undefined,
      total, status: 'pendente', itens: items,
    };

    if (clube) {
      // O banco abate os pontos e revalida o cupom; ele recebe o total sem
      // os pontos e devolve o final.
      dadosPedido.total = totalSemPontos;
      dadosPedido.frete = freteValor;
      dadosPedido.usarCashback = clubeNoAr && pontosUsados.pontos > 0;
      dadosPedido.cupomCodigo = cupomAtivo?.codigo;
      if (clubeNoAr && aniversarioValido(aniversario)) dadosPedido.aniversario = aniversario.trim();
      if (clubeNoAr && whatsappValido(indicadoPor)) dadosPedido.indicadoPor = indicadoPor;
    }

    const result = await submitPedido(dadosPedido, items);
    setIsSubmitting(false);

    if (!result.success) {
      setSubmitError(result.error ?? 'Erro ao registrar pedido.');
      return;
    }

    // Vale o total que o banco gravou: se o saldo mudou entre a tela e o
    // pedido, o Pix e o cartão cobram o valor certo.
    const totalGravado = Number(result.pedido?.total);
    const totalFinal = Number.isFinite(totalGravado) && result.pedido?.total != null ? totalGravado : total;

    setPedidoId(result.pedido?.id ?? null);
    setTxid(`AG${Date.now()}`);
    setSubmittedTotal(totalFinal);
    setPontosGanhoFinal(
      clubeNoAr && clube ? pontosGanhos(totalFinal - freteValor, clube) + bonusBoasVindas : 0
    );

    if (pagamento === 'pix') {
      clearCart();
      setStep('pix');
    } else {
      // Checkout PRO: redireciona para página do Mercado Pago
      if (checkoutProvider.mode === 'pro') {
        setCardProcessing(true);
        const pedido_id = String(result.pedido?.id ?? pedidoId ?? '');
        const checkoutItems = items.map(i => ({
            title: i.nome,
            quantity: i.qtd,
            unit_price: i.preco,
          }));
          // Incluir frete como item adicional no Mercado Pago
          if (freteValor > 0) {
            checkoutItems.push({
              title: frete.label || 'Frete',
              quantity: 1,
              unit_price: freteValor,
            });
          }
          // Com desconto (Pix, cupom, pontos) a soma dos itens passa do que o
          // cliente deve; o Mercado Pago não aceita item negativo, então vai
          // um item só com o valor do pedido.
          const somaItens = checkoutItems.reduce((acc, i) => acc + i.unit_price * i.quantity, 0);
          const itensMp = Math.abs(somaItens - totalFinal) > 0.01
            ? [{ title: 'Pedido Alpha Galerie', quantity: 1, unit_price: totalFinal }]
            : checkoutItems;
          const checkoutResult = await checkoutProvider.startCheckout({
          pedido_id,
          items: itensMp,
          total: totalFinal,
          email: email || undefined,
        });
        setCardProcessing(false);

        if (checkoutResult.error) {
          setSubmitError(checkoutResult.error);
          return;
        }
        // Se sucesso, o redirect já aconteceu — limpar carrinho
        clearCart();
        return;
      }

      // Fluxo transparente (existente)
      clearCart();
      try {
        const mp = await loadMercadoPago();
        setMpInstance(mp);
        setStep('card');
      } catch {
        setSubmitError('Não foi possível carregar o módulo de pagamento. Tente novamente.');
      }
    }
  }

  return (
    <div className={styles.overlay} style={step === 'success' ? { alignItems: 'center' } : undefined}>
      <div ref={dialogRef} className={styles.box} role="dialog" aria-modal="true" aria-label="Finalizar pedido" style={step === 'success' ? { minHeight: 'auto', maxHeight: 'none', justifyContent: 'center' } : undefined}>

        {/* ── Header ── */}
        {step !== 'success' && (
          <div className={styles.head}>
            <div className={styles.headText}>
              <h3 className={styles.headTitle}>Finalizar <em>pedido</em></h3>
              <p className={styles.headSub}>Preencha seus dados para finalizar o pedido.</p>
            </div>
            <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Fechar">×</button>
          </div>
        )}

        {/* ── Body ── */}
        {step === 'form' && (
          <>
            <div className={styles.body}>
              <form id="checkoutForm" onSubmit={handleSubmit} noValidate>

                {/* Dados pessoais */}
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="co_nome">Nome completo *</label>
                  <input id="co_nome" type="text" required className={styles.input} value={nome} onChange={(e) => setNome(e.target.value)} autoComplete="name" placeholder="Seu nome" />
                </div>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="co_whats">WhatsApp *</label>
                  <input id="co_whats" type="tel" required className={styles.input} value={telefone} onChange={(e) => setTelefone(maskTelefone(e.target.value))} placeholder="(11) 99999-9999" autoComplete="tel" />
                  {clubeNoAr && clube && clubeSaldo && (clubeSaldo.pontos > 0 || clubeSaldo.cupons.length > 0) && (
                    <div className={styles.clubeBox}>
                      <p className={styles.clubeSaldo}>
                        {clube.nome}: você tem <strong>{formatarPontos(clubeSaldo.pontos)}</strong> ({fmt(clubeSaldo.valor)})
                        {clubeSaldo.proximoVencimento && clubeSaldo.pontosVencendo > 0 && (
                          <> · {formatarPontos(clubeSaldo.pontosVencendo)} vencem em {formatarDia(clubeSaldo.proximoVencimento)}</>
                        )}
                      </p>
                      {clubeSaldo.aniversarioPontos > 0 && (
                        <span className={styles.clubeNota}>🎂 Feliz aniversário! Entraram {formatarPontos(clubeSaldo.aniversarioPontos)} de presente.</span>
                      )}
                      {cupomAtivo ? (
                        clubeSaldo.pontos > 0 && (
                          <span className={styles.clubeNota}>Pontos não somam com cupom. Para usar os pontos, remova o cupom.</span>
                        )
                      ) : pontosDisponiveis.pontos > 0 ? (
                        <>
                          <label className={styles.clubeUsar}>
                            <input type="checkbox" checked={usarPontos} onChange={(e) => setUsarPontos(e.target.checked)} />
                            <span>Usar {formatarPontos(pontosDisponiveis.pontos)} (− {fmt(pontosDisponiveis.desconto)})</span>
                          </label>
                          <span className={styles.clubeNota}>
                            Os pontos pagam até {clube.checkoutMaxPercentual}% dos produtos fora de promoção.
                          </span>
                        </>
                      ) : (
                        clubeSaldo.pontos > 0 && (
                          <span className={styles.clubeNota}>
                            Os pontos pagam até {clube.checkoutMaxPercentual}% dos produtos fora de promoção; neste carrinho não há o que abater.
                          </span>
                        )
                      )}
                      {clubeSaldo.cupons.filter((c) => c.codigo !== cupomAtivo?.codigo).map((c) => (
                        <button
                          key={c.codigo}
                          type="button"
                          className={styles.clubeCupomBtn}
                          onClick={() => handleAplicarCupom(c.codigo)}
                        >
                          Usar cupom {c.codigo} · {fmt(c.valor)}
                          <small> (carrinho a partir de {fmt(c.valorMinimo)}, até {formatarDataBanco(c.validade)})</small>
                        </button>
                      ))}
                    </div>
                  )}
                  {primeiraCompra && clube && clube.bonusBoasVindas > 0 && (
                    <span className={styles.clubeNota} style={{ display: 'block', marginTop: 8 }}>
                      Primeira compra? Você entra no {clube.nome} e ganha {formatarPontos(clube.bonusBoasVindas)} de boas-vindas.
                    </span>
                  )}
                </div>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="co_email">E-mail</label>
                  <input id="co_email" type="email" className={styles.input} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" autoComplete="email" />
                </div>

                {/* Alpha Club: aniversário e indicação (opcionais) */}
                {clubeNoAr && clube && (
                  <div className={styles.clubeExtras}>
                    {!clubeSaldo?.temAniversario && clube.bonusAniversario > 0 && (
                      <div className={styles.field}>
                        <label className={styles.label} htmlFor="co_aniver">
                          Aniversário <span className={styles.labelDica}>· ganhe {formatarPontos(clube.bonusAniversario)} no seu mês</span>
                        </label>
                        <input id="co_aniver" type="text" inputMode="numeric" className={styles.input} value={aniversario} onChange={(e) => setAniversario(mascararAniversario(e.target.value))} placeholder="dia/mês — ex.: 15/03" maxLength={5} style={{ maxWidth: 180 }} />
                      </div>
                    )}
                    {!clubeSaldo?.participante && clube.bonusIndicacao > 0 && (
                      <div className={styles.field}>
                        <label className={styles.label} htmlFor="co_indicado">
                          Quem te indicou? <span className={styles.labelDica}>· número do amigo, opcional</span>
                        </label>
                        <input id="co_indicado" type="tel" className={styles.input} value={indicadoPor} onChange={(e) => setIndicadoPor(maskTelefone(e.target.value))} placeholder="(11) 99999-9999" />
                      </div>
                    )}
                  </div>
                )}

                {/* Campos de endereço */}
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="co_cep">CEP *</label>
                  <input id="co_cep" type="text" className={styles.input} value={cep} onChange={handleCepChange} placeholder="00000-000" maxLength={9} autoComplete="postal-code" style={{ maxWidth: 180 }} />
                  {cepStatus && (
                    <span className={`${styles.cupomStatus} ${cepStatus.ok ? styles.cupomOk : styles.cupomErr}`}>
                      {cepStatus.msg}
                    </span>
                  )}
                </div>
                {programada ? (
                  <div className={styles.field}>
                    <label className={styles.label}>Entrega *</label>
                    <div className={styles.options}>
                      <label className={styles.optLabel}>
                        <input type="radio" name="entrega" value="programada" checked={usaProgramada} onChange={() => setModalidade('programada')} />
                        <span className={styles.optBox}>
                          <span className={styles.optBoxText}>
                            <strong>{programada.label}</strong>
                            <small className={styles.optPrazo}>{programada.prazo}</small>
                            <small>Pedidos até {PEX_CORTE_TEXTO} saem no mesmo dia · seg. a sáb., exceto feriados</small>
                          </span>
                          <span className={styles.optPreco}>{fmt(cupomAtivo?.tipo === 'frete' ? 0 : programada.valor)}</span>
                        </span>
                      </label>
                      <label className={styles.optLabel}>
                        <input type="radio" name="entrega" value="motoboy" checked={!usaProgramada} onChange={() => setModalidade('motoboy')} />
                        <span className={styles.optBox}>
                          <span className={styles.optBoxText}>
                            <strong>{freteMotoboy.label}</strong>
                            <small>Mais rápida · todos os dias</small>
                          </span>
                          <span className={styles.optPreco}>{fmt(cupomAtivo?.tipo === 'frete' ? 0 : freteMotoboy.valor)}</span>
                        </span>
                      </label>
                    </div>
                  </div>
                ) : frete.label && (
                  <div className={`${styles.freteBox} ${frete.valor === 0 ? styles.freteCombinar : ''}`}>
                    <span className={styles.freteLabel}>{frete.label}</span>
                    {frete.valor > 0 && (
                      <span className={styles.freteValor}>{fmt(cupomAtivo?.tipo === 'frete' ? 0 : frete.valor)}</span>
                    )}
                  </div>
                )}
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="co_rua">Rua / Avenida</label>
                  <input id="co_rua" type="text" className={styles.input} value={endereco} onChange={(e) => setEndereco(e.target.value)} placeholder="Nome da rua ou avenida" required autoComplete="street-address" disabled={cepLoading} style={{ opacity: cepLoading ? 0.5 : 1 }} />
                </div>
                <div className={`${styles.field} ${styles.addressGrid}`}>
                  <div>
                    <label className={styles.label} htmlFor="co_numero">Número</label>
                    <input ref={numeroRef} id="co_numero" type="text" className={styles.input} value={numero} onChange={(e) => setNumero(e.target.value)} placeholder="123" />
                  </div>
                  <div>
                    <label className={styles.label} htmlFor="co_comp">Complemento</label>
                    <input id="co_comp" type="text" className={styles.input} value={complemento} onChange={(e) => setComplemento(e.target.value)} placeholder="Apto, Bloco, Casa..." />
                  </div>
                </div>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="co_bairro">Bairro</label>
                  <input id="co_bairro" type="text" className={styles.input} value={bairro} onChange={(e) => setBairro(e.target.value)} placeholder="Bairro" disabled={cepLoading} style={{ opacity: cepLoading ? 0.5 : 1 }} />
                </div>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="co_cidade">Cidade</label>
                  <input id="co_cidade" type="text" className={styles.input} value={cidade} onChange={(e) => setCidade(e.target.value)} placeholder="Cidade" autoComplete="address-level2" disabled={cepLoading} style={{ opacity: cepLoading ? 0.5 : 1 }} />
                </div>

                {/* Observações */}
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="co_obs">Observações</label>
                  <textarea id="co_obs" className={styles.textarea} value={observacoes} onChange={(e) => setObservacoes(e.target.value)} placeholder="Alguma observação sobre o pedido" />
                </div>

                {/* Cupom */}
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="co_cupom">Cupom de desconto</label>
                  <div className={styles.cupomRow}>
                    <input
                      id="co_cupom"
                      type="text"
                      className={`${styles.input} ${styles.cupomInput}`}
                      value={cupomInput}
                      onChange={(e) => setCupomInput(e.target.value.toUpperCase())}
                      placeholder="Digite o código"
                      style={{ textTransform: 'uppercase' }}
                    />
                    <button type="button" className={styles.cupomBtn} onClick={() => handleAplicarCupom()} disabled={cupomLoading}>{cupomLoading ? '...' : 'APLICAR'}</button>
                  </div>
                  {cupomStatus && (
                    <span className={`${styles.cupomStatus} ${cupomStatus.ok ? styles.cupomOk : styles.cupomErr}`}>
                      {cupomStatus.msg}
                    </span>
                  )}
                </div>

                {/* Pagamento */}
                <div className={styles.field}>
                  <label className={styles.label}>Forma de pagamento *</label>
                  <div className={styles.options}>
                    <label className={styles.optLabel}>
                      <input type="radio" name="pagamento" value="pix" required checked={pagamento === 'pix'} onChange={() => setPagamento('pix')} />
                      <span className={styles.optBox}>
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                        </svg>
                        <span className={styles.optBoxText}><strong>Pix</strong></span>
                        <span className={styles.badgeGold}>5% OFF</span>
                      </span>
                    </label>
                    <label className={styles.optLabel}>
                      <input type="radio" name="pagamento" value="cartao" checked={pagamento === 'cartao'} onChange={() => setPagamento('cartao')} />
                      <span className={styles.optBox}>
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                          <rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/>
                        </svg>
                        <span className={styles.optBoxText}>
                          <strong>Cartão</strong>
                          <small>Crédito ou débito — até 12×</small>
                        </span>
                      </span>
                    </label>
                  </div>
                </div>

                {/* Resumo */}
                <div className={styles.summary}>
                  <p className={styles.summaryTitle}>Resumo do pedido</p>
                  {items.map((item) => (
                    <div key={item.cartKey} className={styles.summaryLine}>
                      <span>{item.nome}{item.qtd > 1 ? ` ×${item.qtd}` : ''}</span>
                      <strong>{fmt(item.preco * item.qtd)}</strong>
                    </div>
                  ))}
                  {descontoPix > 0 && (
                    <div className={`${styles.summaryLine} ${styles.summaryLineGold}`}>
                      <span>Desconto PIX (5%)</span>
                      <span>− {fmt(descontoPix)}</span>
                    </div>
                  )}
                  {freteValor > 0 && (
                    <div className={styles.summaryLine}>
                      <span>{frete.label || 'Frete'}</span>
                      <strong>{fmt(freteValor)}</strong>
                    </div>
                  )}
                  {frete.valor > 0 && cupomAtivo?.tipo === 'frete' && (
                    <div className={`${styles.summaryLine} ${styles.summaryLineGreen}`}>
                      <span>Frete grátis (cupom)</span>
                      <span>− {fmt(frete.valor)}</span>
                    </div>
                  )}
                  {descontoCupom > 0 && (
                    <div className={`${styles.summaryLine} ${styles.summaryLineGreen}`}>
                      <span>Cupom {cupomAtivo?.codigo}</span>
                      <span>− {fmt(descontoCupom)}</span>
                    </div>
                  )}
                  {pontosUsados.pontos > 0 && (
                    <div className={`${styles.summaryLine} ${styles.summaryLineGreen}`}>
                      <span>{clube?.nome} ({formatarPontos(pontosUsados.pontos)})</span>
                      <span>− {fmt(pontosUsados.desconto)}</span>
                    </div>
                  )}
                  <div className={styles.summaryTotal}>
                    <span className={styles.summaryTotalLabel}>Total</span>
                    <span className={styles.summaryTotalValue}>{fmt(total)}</span>
                  </div>
                  {clubeNoAr && clube && pontosGanho + bonusBoasVindas > 0 && (
                    <p className={styles.clubeGanho}>
                      Você ganha <strong>{formatarPontos(pontosGanho + bonusBoasVindas)}</strong>
                      {' '}({fmt(valorDosPontos(pontosGanho + bonusBoasVindas, clube))}) no {clube.nome}
                      {bonusBoasVindas > 0 && <>, com {formatarPontos(bonusBoasVindas)} de boas-vindas</>}
                    </p>
                  )}
                </div>

                {submitError && <p className={styles.error} role="alert">{submitError}</p>}
              </form>
            </div>

            {/* Footer fixo */}
            <div className={styles.foot}>
              {submitError && (
                <p role="alert" style={{ color: '#ef4444', fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: '0.1em', marginBottom: 10 }}>
                  ✗ {submitError}
                </p>
              )}
              <div className={styles.footTotal}>
                <span className={styles.footTotalLabel}>Total</span>
                <span className={styles.footTotalValue}>{fmt(total)}</span>
              </div>
              <div className={styles.footActions}>
                <button type="button" className={styles.btnGhost} onClick={onClose}>Voltar</button>
                <button type="submit" form="checkoutForm" className={styles.btnGold} disabled={isSubmitting} aria-busy={isSubmitting}>
                  {isSubmitting ? 'Enviando...' : 'Confirmar pedido'}
                </button>
              </div>
            </div>
          </>
        )}

        {step === 'pix' && (
          <>
            <div className={styles.body}>
              {pontosGanhoFinal > 0 && clube && (
                <p className={styles.clubeGanho} style={{ margin: '20px 24px 0' }}>
                  Seus <strong>{formatarPontos(pontosGanhoFinal)}</strong> entram no {clube.nome} assim que o pagamento for confirmado.
                </p>
              )}
              <PixPayment total={displayTotal} txid={txid} onClose={onClose} />
            </div>
          </>
        )}

        {step === 'card' && mpInstance && (
          <>
            <div className={styles.body}>
              <h3 className={styles.headTitle} style={{ marginBottom: 8 }}>Pagamento com <em>Cartão</em></h3>
              <p className={styles.headSub} style={{ marginBottom: 20 }}>Total: {fmt(displayTotal)}</p>
              {submitError && (
                <p style={{ color: '#ef4444', fontFamily: "'JetBrains Mono', monospace", fontSize: 11, marginBottom: 12 }}>
                  {submitError}
                </p>
              )}
              {cardProcessing ? (
                <p style={{ textAlign: 'center', color: '#c9a961', fontFamily: "'JetBrains Mono', monospace", fontSize: 12, letterSpacing: '0.1em', padding: '32px 0' }}>
                  Processando pagamento...
                </p>
              ) : (
                <CardPaymentSafe
                  amount={displayTotal}
                  mp={mpInstance}
                  onTokenReceived={async (token: string, paymentMethodId: string) => {
                    if (!pedidoId) return;
                    setCardProcessing(true);
                    setSubmitError(null);
                    try {
                      const { data, error } = await supabase.functions.invoke('process-card-payment', {
                        body: { token, pedido_id: pedidoId, payment_method_id: paymentMethodId },
                      });
                      if (error) throw error;
                      if (data?.success) {
                        setStep('success');
                      } else {
                        setSubmitError(getMpErrorMessage(data?.reason ?? ''));
                      }
                    } catch {
                      setSubmitError('Erro ao processar pagamento. Tente novamente.');
                    } finally {
                      setCardProcessing(false);
                    }
                  }}
                />
              )}
            </div>
          </>
        )}

        {step === 'success' && (
          <div className={styles.success}>
            <div className={styles.successCheck} aria-hidden="true">✓</div>
            <h2 className={styles.successTitle}>Pedido confirmado!</h2>
            {pedidoId && <p className={styles.successId}>Pedido #{pedidoId}</p>}
            <p className={styles.successMsg}>Em breve entraremos em contato pelo WhatsApp para confirmar os detalhes.</p>
            {pontosGanhoFinal > 0 && clube && (
              <p className={styles.clubeGanho}>
                Você ganhou <strong>{formatarPontos(pontosGanhoFinal)}</strong> no {clube.nome}. Consulte e use na página inicial da loja.
              </p>
            )}
            <button type="button" onClick={onClose} style={{ padding: '14px 48px', background: '#c9a961', border: 'none', color: '#000', fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', cursor: 'pointer', marginTop: 8 }}>FECHAR</button>
          </div>
        )}

      </div>
    </div>
  );
}
