import { Link } from 'react-router-dom';

export default function CheckoutErro() {
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
        <div style={{ fontSize: 48, marginBottom: 16 }}>&#10007;</div>
        <h1 style={{ fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.1em', fontSize: 18, color: '#ff4444' }}>
          Pagamento n&#227;o aprovado
        </h1>
        <p style={{ color: '#888', marginTop: 8, fontSize: 14 }}>
          Houve um problema com seu pagamento. Por favor, tente novamente ou escolha outra forma de pagamento.
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
