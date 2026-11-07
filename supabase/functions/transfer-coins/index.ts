import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { from_user_id, to_telegram_id, amount } = await req.json()

    if (
      !from_user_id ||
      !to_telegram_id ||
      typeof amount !== 'number' ||
      amount < 1 ||
      amount > 100000
    ) {
      return new Response(
        JSON.stringify({ success: false, message: 'Invalid request' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Отправитель
    const { data: fromUser } = await supabase
      .from('users')
      .select('id, coins')
      .eq('id', from_user_id)
      .single()

    if (!fromUser || fromUser.coins < amount) {
      return new Response(
        JSON.stringify({ success: false, message: 'Недостаточно монет' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Получатель
    const { data: toUser } = await supabase
      .from('users')
      .select('id, coins')
      .eq('telegram_id', to_telegram_id)
      .single()

    if (!toUser) {
      return new Response(
        JSON.stringify({ success: false, message: 'Получатель не найден' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (fromUser.id === toUser.id) {
      return new Response(
        JSON.stringify({ success: false, message: 'Нельзя перевести себе' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Перевод
    await supabase
      .from('users')
      .update({ coins: fromUser.coins - amount })
      .eq('id', fromUser.id)

    await supabase
      .from('users')
      .update({ coins: toUser.coins + amount })
      .eq('id', toUser.id)

    return new Response(
      JSON.stringify({
        success: true,
        from_coins: fromUser.coins - amount,
        to_coins: toUser.coins + amount,
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
