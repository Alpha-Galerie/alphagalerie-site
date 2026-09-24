import { useEffect, useState } from 'react';
import {
  carregarCashbackRegras,
  consultarCashback,
  normalizarWhatsapp,
  whatsappValido,
  type CashbackRegras,
  type CashbackSaldo,
} from '../lib/cashback';

/** Regras do programa; null enquanto carrega ou se o programa estiver fora do ar. */
export function useCashbackRegras(): CashbackRegras | null {
  const [regras, setRegras] = useState<CashbackRegras | null>(null);

  useEffect(() => {
    let ativo = true;
    carregarCashbackRegras().then((r) => {
      if (ativo) setRegras(r);
    });
    return () => { ativo = false; };
  }, []);

  return regras;
}

/**
 * Saldo do WhatsApp digitado. Espera o cliente parar de digitar para não
 * consultar o banco a cada tecla.
 */
export function useCashbackSaldo(whatsapp: string, habilitado = true): CashbackSaldo | null {
  const [saldo, setSaldo] = useState<CashbackSaldo | null>(null);
  const chave = habilitado && whatsappValido(whatsapp) ? normalizarWhatsapp(whatsapp) : '';

  useEffect(() => {
    setSaldo(null);
    if (!chave) return;
    let ativo = true;
    const timer = setTimeout(() => {
      consultarCashback(chave).then((s) => {
        if (ativo) setSaldo(s);
      });
    }, 400);
    return () => {
      ativo = false;
      clearTimeout(timer);
    };
  }, [chave]);

  return saldo;
}
