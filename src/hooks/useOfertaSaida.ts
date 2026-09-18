import { useEffect, useState } from 'react';

const CHAVE_MOSTRADO = 'ag_oferta_mostrada_em';
const CHAVE_JA_COMPROU = 'ag_ja_comprou';
const ESPERA_DIAS = 7;

/** Marca que a pessoa já fechou um pedido. A oferta é "primeira compra" —
 *  oferecê-la a quem já comprou é desconto jogado fora. */
export function marcarQueJaComprou() {
  try { localStorage.setItem(CHAVE_JA_COMPROU, '1'); } catch { /* modo privado */ }
}

function jaComprou(): boolean {
  try { return localStorage.getItem(CHAVE_JA_COMPROU) === '1'; } catch { return false; }
}

/** Já viu a oferta há menos de ESPERA_DIAS? Evita perseguir quem já recusou. */
function viuRecentemente(): boolean {
  try {
    const quando = localStorage.getItem(CHAVE_MOSTRADO);
    if (!quando) return false;
    return Date.now() - Number(quando) < ESPERA_DIAS * 86_400_000;
  } catch {
    return false;
  }
}

function registrarExibicao() {
  try { localStorage.setItem(CHAVE_MOSTRADO, String(Date.now())); } catch { /* modo privado */ }
}

function ehTouch(): boolean {
  return typeof window !== 'undefined' &&
    (navigator.maxTouchPoints > 0 || window.matchMedia('(pointer: coarse)').matches);
}

/**
 * Mostra a oferta de primeira compra quando a pessoa dá sinal de que vai sair.
 *
 * Três correções em relação ao comportamento anterior:
 *
 * 1. Antes a oferta era suprimida quando havia itens no carrinho
 *    (`if (cartItems.length > 0) return`). Carrinho cheio prestes a ser
 *    abandonado é justamente a venda que vale a pena salvar.
 *
 * 2. O único gatilho de saída era `mouseleave`, que não existe em celular —
 *    e o celular é a maior parte do público. No touch, o sinal é a rolagem
 *    rápida de volta ao topo depois de ter descido a página.
 *
 * 3. O controle ficava em sessionStorage, então reaparecia a cada nova aba.
 *    Agora é localStorage com espera de 7 dias, e quem já comprou não vê.
 */
export function useOfertaSaida(): [boolean, () => void] {
  const [aberta, setAberta] = useState(false);

  useEffect(() => {
    if (jaComprou() || viuRecentemente()) return;

    let encerrado = false;
    const touch = ehTouch();

    function mostrar() {
      if (encerrado) return;
      encerrado = true;
      registrarExibicao();
      setAberta(true);
      limpar();
    }

    // Desktop: cursor saindo pelo topo da janela.
    function saidaMouse(e: MouseEvent) {
      if (e.clientY <= 0) mostrar();
    }

    // Celular: desceu a página (houve interesse) e voltou ao topo com
    // rolagem rápida — o gesto de quem vai fechar a aba.
    let maiorScroll = 0;
    let ultimoY = window.scrollY;
    let ultimoT = Date.now();
    function saidaScroll() {
      const y = window.scrollY;
      const agora = Date.now();
      maiorScroll = Math.max(maiorScroll, y);
      const dt = agora - ultimoT || 1;
      const velocidade = (ultimoY - y) / dt;          // positiva = subindo
      if (maiorScroll > 600 && y < 120 && velocidade > 1.2) mostrar();
      ultimoY = y;
      ultimoT = agora;
    }

    // Rede de segurança: quem fica parado sem interagir também recebe.
    const timer = setTimeout(mostrar, touch ? 45_000 : 90_000);

    function limpar() {
      clearTimeout(timer);
      document.removeEventListener('mouseleave', saidaMouse);
      window.removeEventListener('scroll', saidaScroll);
    }

    if (touch) window.addEventListener('scroll', saidaScroll, { passive: true });
    else document.addEventListener('mouseleave', saidaMouse);

    return limpar;
  }, []);

  return [aberta, () => setAberta(false)];
}
