import { useState, useEffect, useCallback } from 'react'
import { User } from '@/types'
import { getOrCreateUser } from '@/lib/supabase'

declare global {
  interface Window {
    Telegram?: {
      WebApp: {
        initDataUnsafe: {
          user?: {
            id: number
            first_name: string
            last_name?: string
            username?: string
            photo_url?: string
          }
        }
        ready: () => void
        expand: () => void
        setHeaderColor: (color: string) => void
        setBackgroundColor: (color: string) => void
        HapticFeedback?: {
          impactOccurred: (style: string) => void
          notificationOccurred: (type: string) => void
        }
        openTelegramLink: (url: string) => void
        showAlert: (message: string) => void
        showConfirm: (message: string, callback: (ok: boolean) => void) => void
      }
    }
  }
}

export function useUser() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const init = useCallback(async () => {
    try {
      setLoading(true)
      const tg = window.Telegram?.WebApp
      tg?.ready()
      tg?.expand()
      tg?.setHeaderColor('#1a1a2e')
      tg?.setBackgroundColor('#1a1a2e')

      const tgUser = tg?.initDataUnsafe?.user

      // Для локальной разработки без Telegram
      const fallbackUser = {
        id: 123456789,
        first_name: 'Dev',
        last_name: 'User',
        username: 'devuser',
        photo_url: undefined,
      }

      const telegramUser = tgUser || fallbackUser

      const dbUser = await getOrCreateUser(telegramUser)
      setUser(dbUser as User)
    } catch (e) {
      console.error(e)
      setError(e instanceof Error ? e.message : 'Ошибка загрузки пользователя')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    init()
  }, [init])

  const refreshUser = useCallback(async () => {
    if (!user) return
    try {
      const { data } = await import('@/lib/supabase').then((m) =>
        m.supabase.from('users').select('*').eq('id', user.id).single()
      )
      if (data) setUser(data as User)
    } catch (e) {
      console.error(e)
    }
  }, [user])

  return { user, loading, error, setUser, refreshUser }
}
