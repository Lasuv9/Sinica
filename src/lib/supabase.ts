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

export async function authenticateUser() {
  const initData = getTelegramInitData()

  if (!initData) {
    throw new Error('Открой Sinica через Telegram-бота, а не через обычный браузер.')
  }

  const { data, error } = await supabase.functions.invoke('auth', {
    body: { initData },
  })

  if (error) throw new Error(error.message || 'Ошибка авторизации')
  if (!data?.success || !data?.user) {
    throw new Error(data?.message || 'Не удалось подтвердить Telegram')
  }

  return {
    user: { ...data.user, owned_skins: data.owned_skins || ['default'] },
  }
}
