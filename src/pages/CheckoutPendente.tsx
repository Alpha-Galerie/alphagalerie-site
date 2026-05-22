import { Link } from 'react-router-dom';

export default function CheckoutPendente() {
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
        <div style={{ fontSize: 48, marginBottom: 16 }}>&#9203;</div>
        <h1 style={{ fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.1em', fontSize: 18 }}>
          Pagamento pendente
        </h1>
        <p style={{ color: '#888', marginTop: 8, fontSize: 14 }}>
          Seu pagamento est&#225; sendo processado. Voc&#234; receber&#225; uma confirma&#231;&#227;o assim que for aprovado.
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
      </div>
    </div>
  );
}
