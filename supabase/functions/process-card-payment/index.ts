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

    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!UUID_REGEX.test(String(pedido_id))) {
      return new Response(
        JSON.stringify({ success: false, error: 'Dados incompletos.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

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

    const mpResponse = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': `pedido-${pedido_id}-${token}`,
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
      const { error: updateError } = await supabase
        .from('pedidos')
        .update({ status: 'pago', mp_payment_id: Number(payment.id) })
        .eq('id', pedido_id)

      if (updateError) {
        console.error('CRITICAL: payment approved but DB update failed', {
          pedido_id,
          mp_payment_id: payment.id,
          error: updateError,
        })
      }

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
