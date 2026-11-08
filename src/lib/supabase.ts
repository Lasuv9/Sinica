import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Не настроено подключение к Supabase')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export function getTelegramInitData(): string {
  return window.Telegram?.WebApp?.initData || ''
}

async function getOrCreateUser(telegramUser: {
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
    .maybeSingle()

  if (existing) {
    return {
      ...existing,
      owned_skins: existing.owned_skins || ['default'],
      tap_cycle: existing.tap_cycle ?? 0,
    }
  }

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
      tap_cycle: 0,
      current_skin: 'default',
    })
    .select()
    .single()

  if (error) throw error

  return {
    ...created,
    owned_skins: ['default'],
    tap_cycle: created.tap_cycle ?? 0,
  }
}

export async function authenticateUser() {
  const initData = getTelegramInitData()

  // Пробуем безопасную auth через Edge Function, если есть initData
  if (initData) {
    try {
      const { data, error } = await supabase.functions.invoke('auth', {
        body: { initData },
      })

      if (!error && data?.success && data?.user) {
        return {
          user: {
            ...data.user,
            owned_skins: data.owned_skins || data.user.owned_skins || ['default'],
            tap_cycle: data.user.tap_cycle ?? 0,
          },
        }
      }
    } catch (e) {
      console.warn('auth function unavailable, fallback', e)
    }
  }

  // Fallback: пользователь из Telegram WebApp без строгой проверки initData
  const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user
  if (tgUser?.id) {
    const user = await getOrCreateUser({
      id: tgUser.id,
      first_name: tgUser.first_name,
      last_name: tgUser.last_name,
      username: tgUser.username,
      photo_url: tgUser.photo_url,
    })
    return { user }
  }

  // Dev / браузер: локальный пользователь, чтобы приложение не блокировалось
  const user = await getOrCreateUser({
    id: 100000001,
    first_name: 'Dev',
    last_name: 'User',
    username: 'devuser',
  })

  return { user }
}
