import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { authenticateTelegram } from '../_shared/auth.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    const auth = await authenticateTelegram(initData)
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    let { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('telegram_id', auth.telegram_id)
      .maybeSingle()

    if (!user) {
      const { data: created, error } = await supabase
        .from('users')
        .insert({
          telegram_id: auth.telegram_id,
          first_name: auth.user.first_name || 'Player',
          last_name: auth.user.last_name || null,
          username: auth.user.username || null,
          avatar_url: auth.user.photo_url || null,
          coins: 0,
          total_taps: 0,
          tap_cycle: 0,
          current_skin: 'default',
        })
        .select()
        .single()
      if (error) throw error
      user = created
    }

    const { data: skins } = await supabase
      .from('user_skins')
      .select('skin_id')
      .eq('user_id', user.id)

    const owned_skins = [
      'default',
      ...((skins || []).map((s: { skin_id: string }) => s.skin_id)),
    ]

    // Active boost from user_boosts (expires_at > now)
    const { data: boost } = await supabase
      .from('user_boosts')
      .select('multiplier, expires_at')
      .eq('user_id', user.id)
      .gt('expires_at', new Date().toISOString())
      .order('expires_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    const active_boost = boost
      ? {
          multiplier: Number(boost.multiplier) || 1,
          expires_at: boost.expires_at as string,
        }
      : null

    return new Response(
      JSON.stringify({
        success: true,
        user: {
          ...user,
          owned_skins: [...new Set(owned_skins)],
          active_boost,
          boost_multiplier: active_boost?.multiplier ?? 1,
          boost_expires_at: active_boost?.expires_at ?? null,
        },
        owned_skins: [...new Set(owned_skins)],
        active_boost,
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
