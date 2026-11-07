import { useState } from 'react'
import { User } from '@/types'
import { SKINS } from '@/lib/utils'
import { ShopItem } from '@/components/ShopItem'
import { supabase } from '@/lib/supabase'
import { haptic } from '@/lib/utils'

interface ShopProps {
  user: User
  setUser: (u: User) => void
}

export function Shop({ user, setUser }: ShopProps) {
  const [loading, setLoading] = useState<string | null>(null)
  // В реальном приложении owned skins хранятся в отдельной таблице
  // Для простоты считаем, что default всегда есть, остальные — если хватает монет или уже куплены
  const [owned, setOwned] = useState<string[]>(['default'])

  const handleBuy = async (skinId: string, price: number) => {
    if (user.coins < price || loading) return

    setLoading(skinId)
    try {
      const { data, error } = await supabase.functions.invoke('buy-skin', {
        body: { user_id: user.id, skin_id: skinId },
      })

      if (error) throw error

      if (data?.success) {
        setUser({
          ...user,
          coins: data.coins,
          current_skin: data.current_skin,
        })
        setOwned((prev) => [...prev, skinId])
        haptic('success')
      } else {
        haptic('error')
        window.Telegram?.WebApp?.showAlert(data?.message || 'Не удалось купить')
      }
    } catch (e) {
      console.error(e)
      haptic('error')
      // Fallback: локальная покупка для демо
      if (user.coins >= price) {
        setUser({
          ...user,
          coins: user.coins - price,
          current_skin: skinId,
        })
        setOwned((prev) => [...prev, skinId])
      }
    } finally {
      setLoading(null)
    }
  }

  const handleSelect = async (skinId: string) => {
    setUser({ ...user, current_skin: skinId })
    // Можно синхронизировать с сервером
    await supabase
      .from('users')
      .update({ current_skin: skinId })
      .eq('id', user.id)
    haptic('light')
  }

  return (
    <div className="page shop-page">
      <h1 className="page-title">Магазин</h1>
      <p className="page-subtitle">Покупай скины для синицы</p>

      <div className="shop-list">
        {SKINS.map((skin) => (
          <ShopItem
            key={skin.id}
            skin={skin}
            owned={owned.includes(skin.id) || skin.price === 0}
            current={user.current_skin === skin.id}
            canBuy={user.coins >= skin.price}
            onBuy={() => handleBuy(skin.id, skin.price)}
            onSelect={() => handleSelect(skin.id)}
          />
        ))}
      </div>
    </div>
  )
}
