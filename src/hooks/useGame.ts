import { useState, useCallback, useRef } from 'react'
import { User } from '@/types'
import { playPopSound, haptic } from '@/lib/utils'
import { getTelegramInitData, supabase } from '@/lib/supabase'

export function useGame(user: User | null, setUser: (u: User) => void) {
  const [isPopping, setIsPopping] = useState(false)
  const [lastReward, setLastReward] = useState(0)
  const isTapping = useRef(false)

  const fatLevel = user ? (user.tap_cycle ?? 0) : 0

  const tap = useCallback(async () => {
    if (!user || isTapping.current) return
    isTapping.current = true

    try {
      const { data, error } = await supabase.functions.invoke('tap', {
        body: {
          initData: getTelegramInitData(),
          request_id: crypto.randomUUID(),
        },
      })

      if (error) throw error
      if (!data?.success) throw new Error(data?.message || 'Не удалось засчитать нажатие')

      setUser({
        ...user,
        coins: data.coins,
        total_taps: data.total_taps,
        tap_cycle: data.tap_cycle,
      })

      setLastReward(1)
      haptic('light')

      if (data.popped) {
        setIsPopping(true)
        playPopSound()
        haptic('success')
        window.setTimeout(() => setIsPopping(false), 420)
      }
    } catch (e) {
      console.error('Tap error', e)
      window.Telegram?.WebApp?.showAlert(
        e instanceof Error ? e.message : 'Ошибка соединения. Попробуй ещё раз.'
      )
    } finally {
      isTapping.current = false
    }
  }, [user, setUser])

  return { fatLevel, isPopping, lastReward, tap }
}
