# Design: Cobrança por Cartão via Mercado Pago

**Data:** 2026-05-21  
**Status:** Aprovado  

---

## Contexto

O checkout já suporta geração de token MP via `mp.createCardToken()` no browser (sem Checkout Bricks). O token era descartado em `onTokenReceived` — nenhuma cobrança real acontecia. Este spec cobre a implementação completa do fluxo de cobrança.

---

## Arquitetura

```
Frontend (React)
  CardPayment.tsx
    └─ mp.createCardToken() → token opaco (cartão nunca toca nosso servidor)
  CheckoutModal.tsx
    └─ onTokenReceived(token, paymentMethodId)
         └─ POST /functions/v1/process-card-payment
              └─ { token, pedido_id, payment_method_id }

Edge Function (Deno) — supabase/functions/process-card-payment/index.ts
    1. Busca pedido no Supabase por pedido_id (valida existência e status='pendente')
    2. Usa total do banco como transaction_amount (ignora valor do frontend)
    3. POST https://api.mercadopago.com/v1/payments
    4. Se approved → UPDATE pedidos SET status='pago', mp_payment_id=<id>
    5. Se rejected → retorna { success: false, reason: <mp_status_detail> }
    6. Se erro → retorna 500

Supabase Secrets
  MP_ACCESS_TOKEN = chave de acesso secreta do MP (nunca exposta no frontend)
```

---

## Componentes afetados

### 1. Nova Edge Function — `process-card-payment`

**Entrada:**
```json
{ "token": "string", "pedido_id": "number", "payment_method_id": "string" }
```

**Lógica:**
1. Busca `pedidos` onde `id = pedido_id` e `status = 'pendente'`
2. Se não encontrar → `400 Bad Request`
3. Chama `POST https://api.mercadopago.com/v1/payments` com:
   - `token` recebido
   - `transaction_amount` = `pedido.total` (do banco, não do frontend)
   - `payment_method_id` recebido
   - `installments: 1`
   - `payer.email` = `pedido.cliente_email`
4. Se `payment.status === 'approved'`:
   - `UPDATE pedidos SET status='pago', mp_payment_id=<id> WHERE id=pedido_id`
   - Retorna `{ success: true }`
5. Se `payment.status === 'rejected'`:
   - Retorna `{ success: false, reason: payment.status_detail }`
6. Qualquer outro status (in_process, pending) → trata como pendente, não atualiza status

**Segurança:**
- `MP_ACCESS_TOKEN` lido de `Deno.env.get('MP_ACCESS_TOKEN')` (Supabase Secret)
- CORS configurado para aceitar apenas origem do site
- `transaction_amount` sempre vem do banco — frontend não pode manipular o valor

### 2. Migração SQL — coluna `mp_payment_id`

```sql
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS mp_payment_id TEXT;
```

Armazena o ID do pagamento MP para reconciliação futura.

### 3. `CheckoutModal.tsx` — mudanças

**Validação:** Se `pagamento === 'cartao'` e `email.trim() === ''`, bloqueia com mensagem:
> "Informe seu e-mail para pagamento por cartão."

**`onTokenReceived`:** Substituir `setStep('success')` por chamada à Edge Function:
1. Exibe loading ("Processando pagamento...")
2. Chama `supabase.functions.invoke('process-card-payment', { token, pedido_id, payment_method_id })`
3. Se `success` → `setStep('success')`
4. Se `!success` → chama callback de erro com mensagem amigável

**Estado adicional:** `cardProcessing: boolean` para bloquear duplo clique durante o processamento.

### 4. `CardPayment.tsx` — mudanças

**Nova prop:** `onError?: (msg: string) => void`  
**Uso:** Chamada em vez de `setError` quando o erro vem da Edge Function (rejeição MP), permitindo que o modal exiba o erro acima do formulário se preferir.

Na prática, o erro de rejeição é exibido dentro do próprio `CardPayment` via `setError` — `onError` é opcional e reservado para erros de rede graves.

---

## Mapeamento de erros MP para mensagens amigáveis

| `status_detail` MP | Mensagem exibida |
|----|---|
| `cc_rejected_insufficient_amount` | Saldo insuficiente no cartão. |
| `cc_rejected_bad_filled_card_number` | Número do cartão inválido. |
| `cc_rejected_bad_filled_date` | Data de validade inválida. |
| `cc_rejected_bad_filled_security_code` | CVV inválido. |
| `cc_rejected_blacklist` | Cartão não autorizado. Tente outro cartão. |
| `cc_rejected_call_for_authorize` | Cartão requer autorização do banco. |
| qualquer outro | Pagamento recusado. Verifique os dados ou tente outro cartão. |

---

## Fluxos

### Caminho feliz
1. Usuário preenche formulário com email, seleciona cartão
2. Clica "Confirmar pedido" → pedido registrado no Supabase como `pendente`
3. Tela de cartão exibida → usuário digita dados
4. Clica "Confirmar Pagamento" → SDK MP gera token
5. `onTokenReceived` → POST para Edge Function
6. MP aprova → pedido atualizado para `pago` → tela de sucesso

### Rejeição pelo MP
1. Edge Function recebe rejeição → retorna `{ success: false, reason }`
2. Frontend mapeia reason para mensagem amigável
3. Exibe erro no formulário de cartão
4. Usuário corrige dados e tenta novamente (pedido continua `pendente`)

### Erro de rede / timeout
1. Edge Function retorna 500 ou falha de rede
2. Frontend exibe: "Erro ao processar pagamento. Tente novamente."
3. Pedido continua `pendente` — não é cancelado

---

## O que NÃO está no escopo

- Parcelamento (implementar futuramente)
- Webhooks de confirmação assíncrona do MP
- Cancelamento automático de pedidos pendentes
- Reembolso via API

---

## Configuração necessária (fora do código)

1. Obter `MP_ACCESS_TOKEN` (chave secreta) no painel do Mercado Pago
2. Adicionar como Supabase Secret: `supabase secrets set MP_ACCESS_TOKEN=<valor>`
3. Deploy da Edge Function: `supabase functions deploy process-card-payment`
