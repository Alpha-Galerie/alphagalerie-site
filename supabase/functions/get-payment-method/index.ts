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
    const { bin } = await req.json()

    if (!bin || bin.length < 6) {
      return new Response(
        JSON.stringify({ error: 'BIN inválido.' }),
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

    const resp = await fetch(
      `https://api.mercadopago.com/v1/payment_methods/installments?bin=${bin}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    )

    if (!resp.ok) {
      return new Response(
        JSON.stringify({ payment_method_id: null }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const data = await resp.json()
    const payment_method_id =
      Array.isArray(data) && data.length > 0 && data[0].payment_method_id
        ? data[0].payment_method_id
        : null

    return new Response(
      JSON.stringify({ payment_method_id }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'Erro interno.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
