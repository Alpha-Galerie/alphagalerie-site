import { useState, useRef } from 'react';

interface CardPaymentProps {
  amount: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  mp: any;
  onTokenReceived: (token: string, paymentMethodId: string) => void;
  onError?: (msg: string) => void;
}

function maskCardNumber(v: string) {
  return v.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim();
}

function maskExpiry(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 4);
  return d.length > 2 ? d.slice(0, 2) + '/' + d.slice(2) : d;
}

export default function CardPayment({ mp, onTokenReceived, onError: _onError }: CardPaymentProps) {
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [holderName, setHolderName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const fieldStyle: React.CSSProperties = {
    width: '100%', padding: '10px 14px',
    background: '#0a0a0a', border: '1px solid #222',
    color: '#f4f4f4', fontFamily: "'Inter', sans-serif",
    fontSize: 14, boxSizing: 'border-box' as const,
    outline: 'none',
  };

  const labelStyle: React.CSSProperties = {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 10, letterSpacing: '0.2em',
    textTransform: 'uppercase' as const,
    color: '#c9a961', display: 'block', marginBottom: 6,
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const digits = cardNumber.replace(/\s/g, '');
    const [expirationMonth, expirationYear] = expiry.split('/');

    try {
      const token = await mp.createCardToken({
        cardNumber: digits,
        cardholderName: holderName,
        cardExpirationMonth: expirationMonth,
        cardExpirationYear: '20' + expirationYear,
        securityCode: cvv,
      });
      onTokenReceived(token.id, token.payment_method_id ?? '');
    } catch (err: unknown) {
      console.error('[MP] createCardToken error:', err);
      setError('Dados do cartão inválidos. Verifique e tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div>
        <label style={labelStyle}>Número do cartão *</label>
        <input
          type="text" inputMode="numeric" autoComplete="cc-number"
          placeholder="0000 0000 0000 0000" required
          value={cardNumber}
          onChange={(e) => setCardNumber(maskCardNumber(e.target.value))}
          style={fieldStyle}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <label style={labelStyle}>Validade *</label>
          <input
            type="text" inputMode="numeric" autoComplete="cc-exp"
            placeholder="MM/AA" required maxLength={5}
            value={expiry}
            onChange={(e) => setExpiry(maskExpiry(e.target.value))}
            style={fieldStyle}
          />
        </div>
        <div>
          <label style={labelStyle}>CVV *</label>
          <input
            type="text" inputMode="numeric" autoComplete="cc-csc"
            placeholder="123" required maxLength={4}
            value={cvv}
            onChange={(e) => setCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
            style={fieldStyle}
          />
        </div>
      </div>

      <div>
        <label style={labelStyle}>Nome no cartão *</label>
        <input
          type="text" autoComplete="cc-name"
          placeholder="Como impresso no cartão" required
          value={holderName}
          onChange={(e) => setHolderName(e.target.value.toUpperCase())}
          style={{ ...fieldStyle, textTransform: 'uppercase' }}
        />
      </div>

      {error && (
        <p style={{ color: '#ef4444', fontFamily: "'JetBrains Mono', monospace", fontSize: 11, margin: 0 }}>
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        style={{
          width: '100%', padding: '16px', background: '#c9a961', border: 'none',
          color: '#000', fontFamily: "'JetBrains Mono', monospace",
          fontSize: 12, fontWeight: 700, letterSpacing: '0.2em',
          textTransform: 'uppercase', cursor: loading ? 'wait' : 'pointer',
          opacity: loading ? 0.7 : 1, marginTop: 8,
        }}
      >
        {loading ? 'Processando...' : 'Confirmar Pagamento'}
      </button>

      <p style={{ textAlign: 'center', color: '#555', fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: '0.1em', margin: 0 }}>
        🔒 Pagamento seguro via Mercado Pago
      </p>
    </form>
  );
}
