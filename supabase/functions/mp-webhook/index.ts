import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json()

    // MP envia: { type: 'payment', data: { id: '...' } }
    if (body.type !== 'payment') {
      return new Response('ok', { status: 200, headers: corsHeaders })
    }

    const paymentId = body.data?.id
    if (!paymentId) {
      return new Response('ok', { status: 200, headers: corsHeaders })
    }

    const accessToken = Deno.env.get('MP_ACCESS_TOKEN')
    if (!accessToken) {
      return new Response('error', { status: 500, headers: corsHeaders })
    }

    // Buscar detalhes do pagamento no MP
    const mpResp = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })

    if (!mpResp.ok) {
      return new Response('ok', { status: 200, headers: corsHeaders })
    }

    const payment = await mpResp.json()
    const pedidoId = payment.external_reference

    if (!pedidoId) {
      return new Response('ok', { status: 200, headers: corsHeaders })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Mapear status do MP para status do pedido
    let novoStatus: string
    switch (payment.status) {
      case 'approved':
        novoStatus = 'pago'
        break
      case 'rejected':
        novoStatus = 'recusado'
        break
      case 'cancelled':
        novoStatus = 'cancelado'
        break
      case 'refunded':
        novoStatus = 'reembolsado'
        break
      default:
        novoStatus = 'pendente'
    }

    // Atualizar pedido no banco
    await supabase
      .from('pedidos')
      .update({
        status: novoStatus,
        mp_payment_id: paymentId,
      })
      .eq('id', pedidoId)
      .eq('status', 'pendente') // Só atualiza se ainda estiver pendente

    return new Response('ok', { status: 200, headers: corsHeaders })
  } catch (err) {
    console.error('Erro no webhook:', err)
    return new Response('error', { status: 500, headers: corsHeaders })
  }
})
