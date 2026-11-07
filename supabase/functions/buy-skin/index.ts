import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SKIN_PRICES: Record<string, number> = {
  default: 0,
  chekushka: 500,
  melstroy: 1500,
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { user_id, skin_id } = await req.json()

    if (!user_id || !skin_id || !(skin_id in SKIN_PRICES)) {
      return new Response(
        JSON.stringify({ success: false, message: 'Invalid request' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const price = SKIN_PRICES[skin_id]

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { data: user, error: userError } = await supabase
      .from('users')
      .select('coins, current_skin')
      .eq('id', user_id)
      .single()

    if (userError || !user) {
      return new Response(
        JSON.stringify({ success: false, message: 'User not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Уже есть этот скин?
    const { data: existing } = await supabase
      .from('user_skins')
      .select('id')
      .eq('user_id', user_id)
      .eq('skin_id', skin_id)
      .maybeSingle()

    if (existing) {
      // Просто надеваем
      await supabase
        .from('users')
        .update({ current_skin: skin_id })
        .eq('id', user_id)

      return new Response(
        JSON.stringify({
          success: true,
          coins: user.coins,
          current_skin: skin_id,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (user.coins < price) {
      return new Response(
        JSON.stringify({ success: false, message: 'Недостаточно монет' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const newCoins = user.coins - price

    // Транзакция: списание + добавление скина + надевание
    await supabase.from('users').update({ coins: newCoins, current_skin: skin_id }).eq('id', user_id)
    await supabase.from('user_skins').insert({ user_id, skin_id })

    return new Response(
      JSON.stringify({
        success: true,
        coins: newCoins,
        current_skin: skin_id,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, message: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
