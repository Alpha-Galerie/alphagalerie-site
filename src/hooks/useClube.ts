import { useCallback, useEffect, useState } from 'react';
import {
  carregarClubeRegras,
  consultarClube,
  normalizarWhatsapp,
  whatsappValido,
  type ClubeRegras,
  type ClubeSaldo,
} from '../lib/clube';

/**
 * Regras do Alpha Club. null enquanto carrega ou se o banco não tem o clube;
 * com o programa pausado chega com `ativo: false`.
 */
export function useClubeRegras(): ClubeRegras | null {
  const [regras, setRegras] = useState<ClubeRegras | null>(null);

  useEffect(() => {
    let ativo = true;
    carregarClubeRegras().then((r) => {
      if (ativo) setRegras(r);
    });
    return () => { ativo = false; };
  }, []);

  return regras;
}

/**
 * Saldo do WhatsApp digitado. Espera o cliente parar de digitar para não
 * consultar o banco a cada tecla. `recarregar` refaz a consulta (depois de
 * trocar pontos por cupom, por exemplo).
 */
export function useClubeSaldo(
  whatsapp: string,
  habilitado = true
): { saldo: ClubeSaldo | null; recarregar: () => void } {
  const [saldo, setSaldo] = useState<ClubeSaldo | null>(null);
  const [versao, setVersao] = useState(0);
  const chave = habilitado && whatsappValido(whatsapp) ? normalizarWhatsapp(whatsapp) : '';

  useEffect(() => {
    setSaldo(null);
    if (!chave) return;
    let ativo = true;
    const timer = setTimeout(() => {
      consultarClube(chave).then((s) => {
        if (ativo) setSaldo(s);
      });
    }, 400);
    return () => {
      ativo = false;
      clearTimeout(timer);
    };
  }, [chave, versao]);

  const recarregar = useCallback(() => setVersao((v) => v + 1), []);
  return { saldo, recarregar };
}
