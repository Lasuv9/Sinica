import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { authenticateTelegram } from '../_shared/auth.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SKIN_ID = 'kind-bird'
const USD_PRICE = 2
const MARKUP = 1.03 // +3% same policy as cosmic

async function fetchUsdRubRate(apiKey: string): Promise<number> {
  // Prefer explicit rate endpoint if project provides one via env override
  const rateUrl = Deno.env.get('ROLLYPAY_RATE_URL') || 'https://rollypay.io/api/v1/rates'
  try {
    const res = await fetch(rateUrl, {
      headers: {
        'X-API-Key': apiKey,
        'X-Nonce': crypto.randomUUID(),
      },
    })
    if (res.ok) {
      const json = await res.json()
      // Accept several possible shapes used by integrators
      const rate =
        Number(json?.USD_RUB) ||
        Number(json?.usd_rub) ||
        Number(json?.rate) ||
        Number(json?.rates?.USD_RUB) ||
        Number(json?.data?.USD_RUB)
      if (rate > 0) return rate
    }
  } catch {
    // fall through
  }

  const envRate = Number(Deno.env.get('USD_RUB_RATE') || 0)
  if (envRate > 0) return envRate

  throw new Error('ROLLYPAY_RATE_UNAVAILABLE')
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    const initData = body.initData as string | undefined
    if (!initData) {
      return new Response(
        JSON.stringify({ success: false, message: 'initData required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const apiKey = Deno.env.get('ROLLYPAY_API_KEY')
    if (!apiKey) {
      return new Response(
        JSON.stringify({ success: false, code: 'ROLLYPAY_NOT_CONFIGURED', message: 'ROLLYPAY_NOT_CONFIGURED' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const auth = await authenticateTelegram(initData)

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { data: user } = await supabase
      .from('users')
      .select('id, telegram_id')
      .eq('telegram_id', auth.telegram_id)
      .maybeSingle()

    if (!user) {
      return new Response(
        JSON.stringify({ success: false, message: 'User not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Already owned?
    const { data: owned } = await supabase
      .from('user_skins')
      .select('id')
      .eq('user_id', user.id)
      .eq('skin_id', SKIN_ID)
      .maybeSingle()

    if (owned) {
      return new Response(
        JSON.stringify({ success: false, code: 'SKIN_ALREADY_OWNED', message: 'SKIN_ALREADY_OWNED' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let rate: number
    try {
      rate = await fetchUsdRubRate(apiKey)
    } catch {
      return new Response(
        JSON.stringify({ success: false, code: 'ROLLYPAY_RATE_UNAVAILABLE', message: 'ROLLYPAY_RATE_UNAVAILABLE' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const chargeAmount = (USD_PRICE * rate * MARKUP).toFixed(2)
    const orderId = `kind-bird_${user.id}_${Date.now()}`

    // Persist order before creating payment
    const { error: orderErr } = await supabase.from('rollypay_skin_orders').insert({
      order_id: orderId,
      user_id: user.id,
      telegram_id: auth.telegram_id,
      skin_id: SKIN_ID,
      usd_amount: USD_PRICE,
      rate_usd_rub: rate,
      charge_amount: chargeAmount,
      charge_currency: 'RUB',
      status: 'created',
    })

    if (orderErr) {
      console.error(orderErr)
      // table schema may differ — try minimal columns
      const { error: orderErr2 } = await supabase.from('rollypay_skin_orders').insert({
        order_id: orderId,
        user_id: user.id,
        skin_id: SKIN_ID,
        amount_rub: chargeAmount,
        status: 'pending',
      })
      if (orderErr2) {
        return new Response(
          JSON.stringify({ success: false, message: 'Order create failed' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    const successUrl = Deno.env.get('ROLLYPAY_SUCCESS_URL') || Deno.env.get('APP_URL') || ''
    const failUrl = Deno.env.get('ROLLYPAY_FAIL_URL') || successUrl

    const payRes = await fetch('https://rollypay.io/api/v1/payments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
        'X-Nonce': crypto.randomUUID(),
      },
      body: JSON.stringify({
        amount: chargeAmount,
        payment_currency: 'RUB',
        order_id: orderId,
        description: 'Sinica — Добрая Синица',
        customer_id: String(auth.telegram_id),
        success_redirect_url: successUrl || undefined,
        fail_redirect_url: failUrl || undefined,
        metadata: {
          skin_id: SKIN_ID,
          telegram_id: auth.telegram_id,
          usd_amount: USD_PRICE,
        },
      }),
    })

    if (!payRes.ok) {
      const text = await payRes.text()
      console.error('RollyPay create failed', payRes.status, text)
      return new Response(
        JSON.stringify({
          success: false,
          code: 'ROLLYPAY_PAYMENT_CREATE_FAILED',
          message: 'ROLLYPAY_PAYMENT_CREATE_FAILED',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const pay = await payRes.json()
    if (!pay.pay_url) {
      return new Response(
        JSON.stringify({
          success: false,
          code: 'ROLLYPAY_PAYMENT_CREATE_FAILED',
          message: 'ROLLYPAY_PAYMENT_CREATE_FAILED',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Store payment id if column exists
    await supabase
      .from('rollypay_skin_orders')
      .update({ payment_id: pay.payment_id, pay_url: pay.pay_url })
      .eq('order_id', orderId)

    return new Response(
      JSON.stringify({
        success: true,
        pay_url: pay.pay_url,
        order_id: orderId,
        display_amount: `${chargeAmount} RUB`,
        charge_amount: chargeAmount,
        charge_currency: 'RUB',
        usd_amount: USD_PRICE,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, message: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
