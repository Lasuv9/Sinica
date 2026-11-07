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
    const { user_id, reward } = await req.json()

    if (!user_id || typeof reward !== 'number' || reward < 1 || reward > 100) {
      return new Response(
        JSON.stringify({ success: false, message: 'Invalid request' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Атомарное обновление
    const { data, error } = await supabase.rpc('increment_tap', {
      p_user_id: user_id,
      p_reward: reward,
    })

    // Fallback если RPC ещё нет
    if (error) {
      const { data: user } = await supabase
        .from('users')
        .select('coins, total_taps')
        .eq('id', user_id)
        .single()

      if (!user) {
        return new Response(
          JSON.stringify({ success: false, message: 'User not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const newCoins = user.coins + reward
      const newTaps = user.total_taps + 1

      await supabase
        .from('users')
        .update({ coins: newCoins, total_taps: newTaps })
        .eq('id', user_id)

      return new Response(
        JSON.stringify({
          success: true,
          coins: newCoins,
          total_taps: newTaps,
          reward,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ success: true, ...data, reward }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, message: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
