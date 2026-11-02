import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { podeUsarPainel } from '../lib/operador';
import PedidosOperador from '../components/operador/PedidosOperador';
import NovoPedidoOperador from '../components/operador/NovoPedidoOperador';
import EstoqueOperador from '../components/operador/EstoqueOperador';
import s from './Operador.module.css';

type Aba = 'pedidos' | 'novo' | 'estoque';

const ABAS: Array<{ id: Aba; nome: string }> = [
  { id: 'pedidos', nome: 'Pedidos' },
  { id: 'novo', nome: 'Pedido manual' },
  { id: 'estoque', nome: 'Estoque' },
];

function Login() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [entrando, setEntrando] = useState(false);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setEntrando(true);
    setErro(null);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: senha });
    if (error) setErro('E-mail ou senha incorretos.');
    setEntrando(false);
  }

  return (
    <div className={s.login}>
      <form className={s.loginCaixa} onSubmit={entrar}>
        <h1 className={s.loginTitulo}>Alpha Galerie · Operação</h1>
        <label className={s.campo}>
          E-mail
          <input className={s.input} type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label className={s.campo}>
          Senha
          <input
            className={s.input}
            type="password"
            autoComplete="current-password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            required
          />
        </label>
        {erro && <p className={s.erro}>{erro}</p>}
        <button type="submit" className={s.botao} disabled={entrando}>
          {entrando ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </div>
  );
}

/**
 * Painel de quem opera o online: pedidos para separar e entregar, pedido
 * manual do WhatsApp e consulta de estoque. Faturamento fica só na
 * retaguarda do dono.
 */
export default function Operador() {
  const queryClient = useQueryClient();
  const [sessao, setSessao] = useState<Session | null | undefined>(undefined);
  const [aba, setAba] = useState<Aba>('pedidos');

  useEffect(() => {
    document.title = 'Operação · Alpha Galerie';
    const robots = document.createElement('meta');
    robots.name = 'robots';
    robots.content = 'noindex, nofollow';
    document.head.appendChild(robots);

    supabase.auth.getSession().then(({ data }) => setSessao(data.session));
    const { data } = supabase.auth.onAuthStateChange((_evento, nova) => setSessao(nova));
    return () => {
      data.subscription.unsubscribe();
      robots.remove();
    };
  }, []);

  async function sair() {
    await supabase.auth.signOut();
    queryClient.removeQueries({ queryKey: ['operador-pedidos'] });
    queryClient.removeQueries({ queryKey: ['operador-produtos'] });
  }

  if (sessao === undefined) return <div className={s.page} />;
  if (!sessao) return <Login />;

  if (!podeUsarPainel(sessao.user.app_metadata?.role)) {
    return (
      <div className={s.login}>
        <div className={s.loginCaixa}>
          <p className={s.aviso} style={{ textAlign: 'center' }}>
            Este login não tem acesso ao painel de operação. Fale com o responsável pela loja.
          </p>
          <button type="button" className={s.botaoSec} onClick={sair}>
            Sair
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={s.page}>
      <header className={s.topo}>
        <span className={s.marca}>Alpha Galerie · Operação</span>
        <button type="button" className={s.sair} onClick={sair}>
          Sair
        </button>
      </header>
      <nav className={s.abas}>
        {ABAS.map((a) => (
          <button
            key={a.id}
            type="button"
            className={`${s.aba} ${a.id === aba ? s.abaAtiva : ''}`}
            onClick={() => setAba(a.id)}
          >
            {a.nome}
          </button>
        ))}
      </nav>
      <main className={s.conteudo}>
        {aba === 'pedidos' && <PedidosOperador />}
        {aba === 'novo' && <NovoPedidoOperador />}
        {aba === 'estoque' && <EstoqueOperador />}
      </main>
    </div>
  );
}
