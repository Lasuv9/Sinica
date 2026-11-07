import { useCallback } from 'react'
import { User } from '@/types'
import { supabase } from '@/lib/supabase'

export function useBalance(user: User | null, setUser: (u: User) => void) {
  const addCoins = useCallback(
    (amount: number) => {
      if (!user) return
      setUser({
        ...user,
        coins: user.coins + amount,
      })
    },
    [user, setUser]
  )

  const spendCoins = useCallback(
    (amount: number) => {
      if (!user || user.coins < amount) return false
      setUser({
        ...user,
        coins: user.coins - amount,
      })
      return true
    },
    [user, setUser]
  )

  const syncBalance = useCallback(async () => {
    if (!user) return
    const { data } = await supabase
      .from('users')
      .select('coins, total_taps, current_skin')
      .eq('id', user.id)
      .single()

    if (data) {
      setUser({
        ...user,
        coins: data.coins,
        total_taps: data.total_taps,
        current_skin: data.current_skin,
      })
    }
  }, [user, setUser])

  return { addCoins, spendCoins, syncBalance }
}
