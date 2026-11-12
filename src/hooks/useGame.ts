import { useState, useCallback, useRef } from 'react'
import { User } from '@/types'
import { getActiveMultiplier, playPopSound, haptic } from '@/lib/utils'
import { getTelegramInitData, supabase } from '@/lib/supabase'

export function useGame(user: User | null, setUser: (u: User) => void) {
  const [isPopping, setIsPopping] = useState(false)
  const [lastReward, setLastReward] = useState(1)
  const isAnimating = useRef(false)
  const userRef = useRef(user)
  userRef.current = user
  const setUserRef = useRef(setUser)
  setUserRef.current = setUser

  const fatLevel = user ? (user.tap_cycle ?? 0) : 0
  const multiplier = getActiveMultiplier(
    user?.boost_expires_at || user?.active_boost?.expires_at,
    user?.boost_multiplier ?? user?.active_boost?.multiplier
  )

  const tap = useCallback(() => {
    const current = userRef.current
    if (!current) return
    if (isAnimating.current) return
    isAnimating.current = true

    const mult = getActiveMultiplier(
      current.boost_expires_at || current.active_boost?.expires_at,
      current.boost_multiplier ?? current.active_boost?.multiplier
    )
    const reward = Math.max(1, mult)

    setUserRef.current({
      ...current,
      coins: current.coins + reward,
      total_taps: current.total_taps + 1,
      tap_cycle: ((current.tap_cycle ?? 0) + 1) % 5,
    })

    setLastReward(reward)
    setIsPopping(true)
    playPopSound()
    haptic('light')

    window.setTimeout(() => {
      setIsPopping(false)
      isAnimating.current = false
    }, 110)

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
        setUserRef.current({
          ...latest,
          coins: typeof data.coins === 'number' ? data.coins : latest.coins,
          total_taps:
            typeof data.total_taps === 'number' ? data.total_taps : latest.total_taps,
          tap_cycle:
            typeof data.tap_cycle === 'number' ? data.tap_cycle : latest.tap_cycle,
          boost_multiplier: data.multiplier ?? latest.boost_multiplier ?? 1,
          boost_expires_at:
            data.boost_expires_at !== undefined
              ? data.boost_expires_at
              : latest.boost_expires_at,
          active_boost:
            data.boost_expires_at && (data.multiplier ?? 1) > 1
              ? { multiplier: data.multiplier ?? 1, expires_at: data.boost_expires_at }
              : (data.multiplier ?? 1) <= 1
                ? null
                : latest.active_boost,
        })
        if (typeof data.reward === 'number') setLastReward(data.reward)
      } catch (e) {
        console.warn('Tap sync error', e)
      }
    })()
  }, [])

  return { fatLevel, isPopping, lastReward, multiplier, tap }
}
