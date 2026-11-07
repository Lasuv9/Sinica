import { useState, useEffect, useCallback } from 'react'
import { User } from '@/types'
import { authenticateUser } from '@/lib/supabase'

export function useUser() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const init = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const tg = window.Telegram?.WebApp
      tg?.ready()
      tg?.expand()
      tg?.setHeaderColor('#1a1a2e')
      tg?.setBackgroundColor('#1a1a2e')

      const result = await authenticateUser()
      setUser(result.user as User)
    } catch (e) {
      console.error(e)
      setError(e instanceof Error ? e.message : 'Ошибка загрузки пользователя')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void init()
  }, [init])

  const refreshUser = useCallback(async () => {
    try {
      const result = await authenticateUser()
      setUser(result.user as User)
    } catch (e) {
      console.error(e)
    }
  }, [])

  return { user, loading, error, setUser, refreshUser }
}
