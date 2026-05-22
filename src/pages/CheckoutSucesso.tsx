import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function CheckoutSucesso() {
  const [searchParams] = useSearchParams();
  const pedidoId = searchParams.get('pedido_id');
  const [status, setStatus] = useState<'loading' | 'pago' | 'pendente'>('loading');

  useEffect(() => {
    if (!pedidoId) {
      setStatus('pendente');
      return;
    }

    // Polling para esperar o webhook atualizar o status
    let attempts = 0;
    const maxAttempts = 10;

    const checkStatus = async () => {
      const { data } = await supabase
        .from('pedidos')
        .select('status')
        .eq('id', pedidoId)
        .single();

      if (data?.status === 'pago') {
        setStatus('pago');
      } else if (attempts < maxAttempts) {
        attempts++;
        setTimeout(checkStatus, 2000);
      } else {
        setStatus('pendente');
      }
    };

    checkStatus();
  }, [pedidoId]);

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#0a0a0a',
      color: '#f4f4f4',
      fontFamily: "'Inter', sans-serif",
    }}>
      <div style={{ textAlign: 'center', maxWidth: 480, padding: 32 }}>
        {status === 'loading' && (
          <>
            <div style={{ fontSize: 48, marginBottom: 16 }}>&#9203;</div>
            <h1 style={{ fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.1em', fontSize: 18 }}>
              Processando seu pagamento...
            </h1>
            <p style={{ color: '#888', marginTop: 8, fontSize: 14 }}>
              Aguarde enquanto confirmamos seu pedido.
            </p>
          </>
        )}

        {status === 'pago' && (
          <>
            <div style={{ fontSize: 48, marginBottom: 16 }}>&#10003;</div>
            <h1 style={{ fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.1em', fontSize: 18, color: '#c9a961' }}>
              Pagamento aprovado!
            </h1>
            <p style={{ color: '#888', marginTop: 8, fontSize: 14 }}>
              Seu pedido foi confirmado. Em breve entraremos em contato.
            </p>
            <Link
              to="/"
              style={{
                display: 'inline-block',
                marginTop: 24,
                padding: '12px 32px',
                background: '#c9a961',
                color: '#0a0a0a',
                textDecoration: 'none',
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 12,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
              }}
            >
              Voltar para a loja
            </Link>
          </>
        )}

        {status === 'pendente' && (
          <>
            <div style={{ fontSize: 48, marginBottom: 16 }}>&#9888;</div>
            <h1 style={{ fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.1em', fontSize: 18 }}>
              Pagamento pendente
            </h1>
            <p style={{ color: '#888', marginTop: 8, fontSize: 14 }}>
              Seu pagamento ainda está sendo processado. Você receberá uma confirmação em breve.
            </p>
            <Link
              to="/"
              style={{
                display: 'inline-block',
                marginTop: 24,
                padding: '12px 32px',
                background: '#c9a961',
                color: '#0a0a0a',
                textDecoration: 'none',
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 12,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
              }}
            >
              Voltar para a loja
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
