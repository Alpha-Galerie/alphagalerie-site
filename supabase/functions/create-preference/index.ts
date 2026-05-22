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
    const { pedido_id, items, email } = await req.json()

    if (!pedido_id || !items || items.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Dados incompletos.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!UUID_REGEX.test(String(pedido_id))) {
      return new Response(
        JSON.stringify({ error: 'ID de pedido inválido.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const accessToken = Deno.env.get('MP_ACCESS_TOKEN')
    if (!accessToken) {
      return new Response(
        JSON.stringify({ error: 'Configuração de pagamento ausente.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Verificar que o pedido existe e está pendente
    const { data: pedido, error: pedidoError } = await supabase
      .from('pedidos')
      .select('id, status')
      .eq('id', pedido_id)
      .single()

    if (pedidoError || !pedido || pedido.status !== 'pendente') {
      return new Response(
        JSON.stringify({ error: 'Pedido não encontrado ou já processado.' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Determinar URLs de callback
    const origin = req.headers.get('origin') || 'https://alphagalerie.com.br'
    const successUrl = `${origin}/checkout/sucesso?pedido_id=${pedido_id}`
    const failureUrl = `${origin}/checkout/erro?pedido_id=${pedido_id}`
    const pendingUrl = `${origin}/checkout/pendente?pedido_id=${pedido_id}`
    const notificationUrl = `${supabaseUrl}/functions/v1/mp-webhook`

    // Criar Preference no Mercado Pago
    const preferenceBody = {
      items: items.map((item: { title: string; quantity: number; unit_price: number }) => ({
        title: item.title,
        quantity: item.quantity,
        unit_price: item.unit_price,
        currency_id: 'BRL',
      })),
      external_reference: pedido_id,
      back_urls: {
        success: successUrl,
        failure: failureUrl,
        pending: pendingUrl,
      },
      auto_return: 'approved',
      notification_url: notificationUrl,
      ...(email ? { payer: { email } } : {}),
    }

    const mpResp = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(preferenceBody),
    })

    if (!mpResp.ok) {
      const mpError = await mpResp.text()
      console.error('Erro ao criar preference MP:', mpError)
      return new Response(
        JSON.stringify({ error: 'Erro ao criar preferência de pagamento.' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const preference = await mpResp.json()

    // Salvar preference_id no pedido para referência futura
    await supabase
      .from('pedidos')
      .update({ mp_preference_id: preference.id })
      .eq('id', pedido_id)

    return new Response(
      JSON.stringify({
        id: preference.id,
        init_point: preference.init_point,
        sandbox_init_point: preference.sandbox_init_point,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('Erro interno:', err)
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
