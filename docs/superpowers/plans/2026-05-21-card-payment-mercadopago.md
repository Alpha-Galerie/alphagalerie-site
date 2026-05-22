# Card Payment via Mercado Pago — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar cobrança real por cartão de crédito/débito via Mercado Pago, usando o token gerado pelo SDK client-side e uma Supabase Edge Function para processar o pagamento com a chave secreta.

**Architecture:** O frontend já gera um token opaco via `mp.createCardToken()`. Uma nova Edge Function Deno recebe esse token + `pedido_id`, busca o valor total diretamente no banco (sem confiar no frontend), e chama a API do MP. Se aprovado, atualiza `pedidos.status = 'pago'`.

**Tech Stack:** React + TypeScript (frontend), Supabase Edge Functions (Deno), Mercado Pago Payments API v1, Supabase JS client `functions.invoke`.

---

## Mapa de arquivos

| Arquivo | Ação | Responsabilidade |
|---|---|---|
| `supabase/functions/process-card-payment/index.ts` | Criar | Edge Function: valida pedido, chama MP, atualiza status |
| `supabase/migrations/20260521000000_add_mp_payment_id.sql` | Criar | Adiciona coluna `mp_payment_id` na tabela `pedidos` |
| `src/components/checkout/CheckoutModal.tsx` | Modificar | Validação de email p/ cartão + chamar Edge Function em `onTokenReceived` |
| `src/components/checkout/CardPayment.tsx` | Modificar | Aceitar prop `onError` para erros graves vindos do modal |

---

## Task 1: Migração SQL — coluna `mp_payment_id`

**Files:**
- Create: `supabase/migrations/20260521000000_add_mp_payment_id.sql`

- [ ] **Step 1: Criar arquivo de migração**

```sql
-- Migration: add mp_payment_id to pedidos
-- Stores Mercado Pago payment ID for reconciliation

ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS mp_payment_id TEXT;
```

- [ ] **Step 2: Aplicar migração no banco remoto**

```bash
supabase db push
```

Esperado: `Applying migration 20260521000000_add_mp_payment_id.sql... done`

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260521000000_add_mp_payment_id.sql
git commit -m "feat: add mp_payment_id column to pedidos"
```

---

## Task 2: Edge Function `process-card-payment`

**Files:**
- Create: `supabase/functions/process-card-payment/index.ts`

- [ ] **Step 1: Criar a pasta e o arquivo da Edge Function**

```bash
mkdir -p supabase/functions/process-card-payment
```

- [ ] **Step 2: Escrever a Edge Function**

Conteúdo completo de `supabase/functions/process-card-payment/index.ts`:

```typescript
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const MP_ERROR_MESSAGES: Record<string, string> = {
  cc_rejected_insufficient_amount: 'Saldo insuficiente no cartão.',
  cc_rejected_bad_filled_card_number: 'Número do cartão inválido.',
  cc_rejected_bad_filled_date: 'Data de validade inválida.',
  cc_rejected_bad_filled_security_code: 'CVV inválido.',
  cc_rejected_blacklist: 'Cartão não autorizado. Tente outro cartão.',
  cc_rejected_call_for_authorize: 'Cartão requer autorização do banco. Entre em contato com seu banco.',
}

function getMpErrorMessage(statusDetail: string): string {
  return MP_ERROR_MESSAGES[statusDetail] ?? 'Pagamento recusado. Verifique os dados ou tente outro cartão.'
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { token, pedido_id, payment_method_id } = await req.json()

    if (!token || !pedido_id || !payment_method_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'Dados incompletos.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Busca pedido no banco usando service role (bypass RLS)
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { data: pedido, error: pedidoError } = await supabase
      .from('pedidos')
      .select('id, total, cliente_email, status')
      .eq('id', pedido_id)
      .eq('status', 'pendente')
      .single()

    if (pedidoError || !pedido) {
      return new Response(
        JSON.stringify({ success: false, error: 'Pedido não encontrado ou já processado.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const accessToken = Deno.env.get('MP_ACCESS_TOKEN')
    if (!accessToken) {
      console.error('MP_ACCESS_TOKEN not set')
      return new Response(
        JSON.stringify({ success: false, error: 'Configuração de pagamento indisponível.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Chama API do Mercado Pago
    const mpResponse = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': `pedido-${pedido_id}-${Date.now()}`,
      },
      body: JSON.stringify({
        token,
        transaction_amount: Number(pedido.total),
        payment_method_id,
        installments: 1,
        payer: {
          email: pedido.cliente_email ?? 'pagamento@alphagalerie.com.br',
        },
      }),
    })

    const payment = await mpResponse.json()

    if (!mpResponse.ok) {
      console.error('MP API error:', payment)
      return new Response(
        JSON.stringify({ success: false, error: 'Erro ao processar pagamento. Tente novamente.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (payment.status === 'approved') {
      await supabase
        .from('pedidos')
        .update({ status: 'pago', mp_payment_id: String(payment.id) })
        .eq('id', pedido_id)

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (payment.status === 'rejected') {
      return new Response(
        JSON.stringify({
          success: false,
          reason: payment.status_detail,
          error: getMpErrorMessage(payment.status_detail),
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // in_process ou pending — não atualiza status
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Pagamento em análise. Aguarde a confirmação por e-mail.',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('process-card-payment error:', err)
    return new Response(
      JSON.stringify({ success: false, error: 'Erro interno. Tente novamente.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
```

- [ ] **Step 3: Verificar que o Supabase CLI está autenticado e o projeto está linkado**

```bash
supabase projects list
```

Esperado: ver `alphagalerie-site` na lista com status linked.

- [ ] **Step 4: Configurar o secret MP_ACCESS_TOKEN no Supabase**

Obter a chave secreta (Access Token) em: https://www.mercadopago.com.br/settings/account/credentials

```bash
supabase secrets set MP_ACCESS_TOKEN=APP_USR-<sua-chave-secreta-aqui>
```

Esperado: `Secret MP_ACCESS_TOKEN set successfully`

- [ ] **Step 5: Deploy da Edge Function**

```bash
supabase functions deploy process-card-payment --no-verify-jwt
```

Esperado: `Deployed process-card-payment` com URL impressa.

> `--no-verify-jwt` é necessário pois o site não tem auth de usuário — a segurança é feita pela validação do pedido no banco.

- [ ] **Step 6: Smoke test manual da Edge Function**

Usando curl para testar que a função está acessível (vai retornar 400 por dados inválidos — isso é esperado):

```bash
curl -X POST https://wxkwkfkidigeuupaajre.supabase.co/functions/v1/process-card-payment \
  -H "Content-Type: application/json" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4a3drZmtpZGlnZXV1cGFhanJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcxNjAzOTUsImV4cCI6MjA5MjczNjM5NX0.HQqpN2EJqRc-3l7DNna659pxn_keGLiTK_p3rObHW7w" \
  -d '{"token":"test","pedido_id":0,"payment_method_id":"visa"}'
```

Esperado: `{"success":false,"error":"Pedido não encontrado ou já processado."}`

- [ ] **Step 7: Commit**

```bash
git add supabase/functions/process-card-payment/index.ts
git commit -m "feat: add process-card-payment edge function"
```

---

## Task 3: Atualizar `CardPayment.tsx` — aceitar prop `onError`

**Files:**
- Modify: `src/components/checkout/CardPayment.tsx`

- [ ] **Step 1: Adicionar prop `onError` à interface e ao componente**

Em `src/components/checkout/CardPayment.tsx`, alterar a interface `CardPaymentProps` e a assinatura do componente:

```typescript
interface CardPaymentProps {
  amount: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  mp: any;
  onTokenReceived: (token: string, paymentMethodId: string) => void;
  onError?: (msg: string) => void;
}

export default function CardPayment({ mp, onTokenReceived, onError }: CardPaymentProps) {
```

> A prop `onError` é opcional — o componente continua funcionando sem ela. Será usada pelo `CheckoutModal` para propagar erros graves (rede, Edge Function) para exibição acima do formulário se necessário. Erros de token MP continuam sendo exibidos via `setError` interno.

- [ ] **Step 2: Commit**

```bash
git add src/components/checkout/CardPayment.tsx
git commit -m "feat: add optional onError prop to CardPayment"
```

---

## Task 4: Atualizar `CheckoutModal.tsx` — validação de email e chamada à Edge Function

**Files:**
- Modify: `src/components/checkout/CheckoutModal.tsx`

- [ ] **Step 1: Adicionar validação de email obrigatório para cartão**

Dentro de `handleSubmit`, após as validações existentes (linha ~218), adicionar antes do `setIsSubmitting(true)`:

```typescript
if (pagamento === 'cartao' && !email.trim()) {
  setSubmitError('Informe seu e-mail para pagamento por cartão.');
  return;
}
```

- [ ] **Step 2: Adicionar estado `cardProcessing`**

Junto aos outros estados no topo do componente (após `const [isSubmitting, setIsSubmitting] = useState(false)`):

```typescript
const [cardProcessing, setCardProcessing] = useState(false);
```

- [ ] **Step 3: Adicionar função auxiliar de mapeamento de erros MP**

Logo antes do `return` do componente (ou antes da função `handleSubmit`), adicionar:

```typescript
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
```

- [ ] **Step 4: Substituir `onTokenReceived` por chamada à Edge Function**

Localizar no JSX (linha ~531):

```tsx
<CardPaymentSafe amount={displayTotal} mp={mpInstance} onTokenReceived={() => { setStep('success'); }} />
```

Substituir por:

```tsx
<CardPaymentSafe
  amount={displayTotal}
  mp={mpInstance}
  onTokenReceived={async (token: string, paymentMethodId: string) => {
    if (!pedidoId) return;
    setCardProcessing(true);
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
```

- [ ] **Step 5: Exibir loading e bloquear duplo clique durante processamento do cartão**

No bloco `{step === 'card' && mpInstance && ...}` (em torno da linha ~526), adicionar feedback visual:

```tsx
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
```

> Nota: o Step 4 e Step 5 são o mesmo bloco JSX — implemente diretamente a versão do Step 5 (completa, com loading e `submitError`), não o Step 4 separado.

- [ ] **Step 6: Garantir que `supabase` está importado no CheckoutModal**

Verificar se já existe import:

```typescript
import { supabase } from '../../lib/supabase';
```

Se não existir, adicionar junto aos outros imports no topo do arquivo.

- [ ] **Step 7: Commit**

```bash
git add src/components/checkout/CheckoutModal.tsx
git commit -m "feat: wire card payment to process-card-payment edge function"
```

---

## Task 5: Atualizar `CardPaymentSafe` para passar `onError`

**Files:**
- Modify: `src/components/checkout/CheckoutModal.tsx`

- [ ] **Step 1: Atualizar o wrapper `CardPaymentSafe` para propagar `onError`**

Localizar no CheckoutModal (linhas ~32-38):

```typescript
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CardPaymentSafe(props: { amount: number; mp: any; onTokenReceived: () => void }) {
  return (
    <CardErrorBoundary>
      <CardPayment amount={props.amount} mp={props.mp} onTokenReceived={props.onTokenReceived} />
    </CardErrorBoundary>
  );
}
```

Substituir por:

```typescript
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CardPaymentSafe(props: { amount: number; mp: any; onTokenReceived: (token: string, paymentMethodId: string) => void; onError?: (msg: string) => void }) {
  return (
    <CardErrorBoundary>
      <CardPayment amount={props.amount} mp={props.mp} onTokenReceived={props.onTokenReceived} onError={props.onError} />
    </CardErrorBoundary>
  );
}
```

- [ ] **Step 2: Build para verificar tipos**

```bash
npx tsc --noEmit
```

Esperado: sem erros de tipo.

- [ ] **Step 3: Commit**

```bash
git add src/components/checkout/CheckoutModal.tsx src/components/checkout/CardPayment.tsx
git commit -m "fix: update CardPaymentSafe signature to match new CardPayment props"
```

---

## Task 6: Teste manual do fluxo completo

- [ ] **Step 1: Subir o dev server**

```bash
npm run dev
```

- [ ] **Step 2: Testar validação de email obrigatório**

1. Abrir o carrinho, adicionar produto
2. Clicar "Finalizar pedido"
3. Preencher nome e telefone, deixar e-mail em branco
4. Selecionar "Cartão" como pagamento
5. Clicar "Confirmar pedido"

Esperado: mensagem de erro "Informe seu e-mail para pagamento por cartão."

- [ ] **Step 3: Testar rejeição de cartão**

Usar cartão de teste do MP para rejeição:
- Número: `5031 4332 1540 6351`
- CVV: `123` | Validade: `11/30` | Nome: `APRO`

Mercado Pago tem cartões de teste em: https://www.mercadopago.com.br/developers/pt/docs/checkout-api/integration-test/test-cards

Esperado: mensagem de erro amigável exibida no formulário de cartão.

- [ ] **Step 4: Testar aprovação de cartão**

Usar cartão de teste para aprovação:
- Número: `5031 4332 1540 6351`
- CVV: `123` | Validade: `11/30` | Nome: `APRO`

> O nome do titular controla o comportamento no sandbox MP: `APRO` = aprovado, `OTHE` = rejeitado.

Esperado: tela de sucesso "Pedido confirmado!" e status do pedido atualizado para `pago` no Supabase.

- [ ] **Step 5: Verificar no banco que `status='pago'` e `mp_payment_id` foi salvo**

```bash
supabase db remote execute "SELECT id, status, mp_payment_id FROM pedidos ORDER BY created_at DESC LIMIT 1;"
```

Esperado: linha com `status=pago` e `mp_payment_id` preenchido.

---

## Configuração de produção (checklist pós-deploy)

- [ ] Obter Access Token de produção em https://www.mercadopago.com.br/settings/account/credentials
- [ ] `supabase secrets set MP_ACCESS_TOKEN=APP_USR-<token-producao>`
- [ ] `supabase functions deploy process-card-payment --no-verify-jwt`
- [ ] Testar com cartão real em valor mínimo (R$ 1,00) antes de anunciar

---

## Referências

- [Mercado Pago — Criar pagamento via API](https://www.mercadopago.com.br/developers/pt/reference/payments/_payments/post)
- [Mercado Pago — Cartões de teste](https://www.mercadopago.com.br/developers/pt/docs/checkout-api/integration-test/test-cards)
- [Supabase Edge Functions — Deno](https://supabase.com/docs/guides/functions)
- Spec: `docs/superpowers/specs/2026-05-21-card-payment-mercadopago-design.md`
