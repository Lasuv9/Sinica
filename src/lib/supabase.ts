import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase env variables are missing')
}

export const supabase = createClient(
  supabaseUrl || '',
  supabaseAnonKey || ''
)

export async function getOrCreateUser(telegramUser: {
  id: number
  first_name: string
  last_name?: string
  username?: string
  photo_url?: string
}) {
  const { data: existing } = await supabase
    .from('users')
    .select('*')
    .eq('telegram_id', telegramUser.id)
    .single()

  if (existing) return existing

  const { data: created, error } = await supabase
    .from('users')
    .insert({
      telegram_id: telegramUser.id,
      first_name: telegramUser.first_name,
      last_name: telegramUser.last_name || null,
      username: telegramUser.username || null,
      avatar_url: telegramUser.photo_url || null,
      coins: 0,
      total_taps: 0,
      current_skin: 'default',
    })
    .select()
    .single()

  if (error) throw error
  return created
}
