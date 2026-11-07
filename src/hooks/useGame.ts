import { useState, useCallback, useRef } from 'react'
import { User } from '@/types'
import { getFatLevel, getTapReward, playPopSound, haptic } from '@/lib/utils'
import { supabase } from '@/lib/supabase'

export function useGame(user: User | null, setUser: (u: User) => void) {
  const [isPopping, setIsPopping] = useState(false)
  const [lastReward, setLastReward] = useState(0)
  const isTapping = useRef(false)

  const fatLevel = user ? getFatLevel(user.total_taps) : 0

  const tap = useCallback(async () => {
    if (!user || isTapping.current) return

    isTapping.current = true
    setIsPopping(true)
    playPopSound()
    haptic('light')

    const reward = getTapReward(user.total_taps)

    // Оптимистичное обновление
    const newCoins = user.coins + reward
    const newTaps = user.total_taps + 1

    setUser({
      ...user,
      coins: newCoins,
      total_taps: newTaps,
    })
    setLastReward(reward)

    // Отправка на сервер (fire-and-forget для скорости)
    try {
      await supabase.functions.invoke('tap', {
        body: { user_id: user.id, reward },
      })
    } catch (e) {
      console.error('Tap sync error', e)
      // Можно откатить, но для кликера обычно не критично
    }

    setTimeout(() => {
      setIsPopping(false)
      isTapping.current = false
    }, 120)
  }, [user, setUser])

  return {
    fatLevel,
    isPopping,
    lastReward,
    tap,
  }
}
