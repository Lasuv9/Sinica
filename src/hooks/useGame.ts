import { useState, useCallback, useRef } from 'react'
import { User } from '@/types'
import { playPopSound, haptic } from '@/lib/utils'
import { getTelegramInitData, supabase } from '@/lib/supabase'

export function useGame(user: User | null, setUser: (u: User) => void) {
  const [isPopping, setIsPopping] = useState(false)
  const [lastReward, setLastReward] = useState(0)
  const isAnimating = useRef(false)
  const userRef = useRef(user)
  userRef.current = user

  const fatLevel = user ? (user.tap_cycle ?? 0) : 0

  const tap = useCallback(() => {
    const current = userRef.current
    if (!current) return

    // Короткая блокировка только на анимацию — сеть больше не глотает тапы
    if (isAnimating.current) return
    isAnimating.current = true

    // Оптимистичное обновление сразу
    const nextCoins = current.coins + 1
    const nextTaps = current.total_taps + 1
    const nextCycle = ((current.tap_cycle ?? 0) + 1) % 5

    setUser({
      ...current,
      coins: nextCoins,
      total_taps: nextTaps,
      tap_cycle: nextCycle,
    })

    setLastReward(1)
    setIsPopping(true)
    playPopSound()
    haptic('light')

    window.setTimeout(() => {
      setIsPopping(false)
      isAnimating.current = false
    }, 140)

    // Синхронизация с сервером в фоне (не блокирует UI)
    void (async () => {
      try {
        const { data, error } = await supabase.functions.invoke('tap', {
          body: {
            initData: getTelegramInitData(),
            request_id: crypto.randomUUID(),
          },
        })

        if (error || !data?.success) return

        const latest = userRef.current
        if (!latest) return

        // Подтягиваем серверные значения, не откатывая локальные тапы назад
        setUser({
          ...latest,
          coins: Math.max(latest.coins, data.coins ?? latest.coins),
          total_taps: Math.max(latest.total_taps, data.total_taps ?? latest.total_taps),
          tap_cycle:
            typeof data.tap_cycle === 'number' ? data.tap_cycle : latest.tap_cycle,
        })

        if (data.popped) {
          haptic('success')
        }
      } catch (e) {
        // Тихо: тап уже засчитан локально, не спамим алертами
        console.warn('Tap sync error', e)
      }
    })()
  }, [setUser])

  return { fatLevel, isPopping, lastReward, tap }
}
