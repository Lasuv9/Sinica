import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { authenticateTelegram } from '../_shared/auth.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const ALLOWED_MULTIPLIERS = new Set([2, 4, 10, 100])

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    const initData = body.initData as string | undefined
    const multiplier = Number(body.multiplier)
    const request_id = body.request_id as string | undefined

    if (!initData || !request_id) {
      return new Response(
        JSON.stringify({ success: false, message: 'initData and request_id required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!ALLOWED_MULTIPLIERS.has(multiplier)) {
      return new Response(
        JSON.stringify({ success: false, message: 'Invalid multiplier' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const auth = await authenticateTelegram(initData)

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { data, error } = await supabase.rpc('buy_boost', {
      p_telegram_id: auth.telegram_id,
      p_multiplier: multiplier,
      p_request_id: request_id,
    })

    if (error) {
      return new Response(
        JSON.stringify({ success: false, message: error.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // RPC may return jsonb row or object
    const result = Array.isArray(data) ? data[0] : data

    if (result && result.success === false) {
      return new Response(
        JSON.stringify({
          success: false,
          message: result.message || 'Не удалось купить улучшение',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({
        success: true,
        coins: result?.coins,
        multiplier: result?.multiplier ?? multiplier,
        boost_expires_at: result?.boost_expires_at ?? result?.expires_at,
        message: result?.message,
        request_id,
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
