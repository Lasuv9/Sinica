import { useState } from 'react'
import { User } from '@/types'
import { SKINS, haptic } from '@/lib/utils'
import { ShopItem } from '@/components/ShopItem'
import { getTelegramInitData, supabase } from '@/lib/supabase'

interface ShopProps {
  user: User
  setUser: (u: User) => void
}

export function Shop({ user, setUser }: ShopProps) {
  const [loading, setLoading] = useState<string | null>(null)
  const owned = user.owned_skins || ['default']

  const handleBuy = async (skinId: string) => {
    if (loading || owned.includes(skinId)) return
    setLoading(skinId)

    try {
      const { data, error } = await supabase.functions.invoke('buy-skin', {
        body: {
          initData: getTelegramInitData(),
          skin_id: skinId,
          request_id: crypto.randomUUID(),
        },
      })

      if (error) throw error
      if (!data?.success) throw new Error(data?.message || 'Не удалось купить скин')

      setUser({
        ...user,
        coins: data.coins,
        current_skin: data.current_skin || skinId,
        owned_skins: [...new Set([...owned, skinId])],
      })

      haptic('success')
    } catch (e) {
      console.error(e)
      haptic('error')
      window.Telegram?.WebApp?.showAlert(
        e instanceof Error ? e.message : 'Ошибка покупки'
      )
    } finally {
      setLoading(null)
    }
  }

  const handleSelect = async (skinId: string) => {
    if (loading || !owned.includes(skinId)) return
    setLoading(skinId)

    try {
      const { data, error } = await supabase.functions.invoke('equip-skin', {
        body: { initData: getTelegramInitData(), skin_id: skinId },
      })

      if (error) throw error
      if (!data?.success) throw new Error(data?.message || 'Не удалось надеть скин')

      setUser({ ...user, current_skin: data.current_skin, coins: data.coins })
      haptic('light')
    } catch (e) {
      console.error(e)
      window.Telegram?.WebApp?.showAlert(
        e instanceof Error ? e.message : 'Ошибка выбора скина'
      )
    } finally {
      setLoading(null)
    }
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
            onBuy={() => handleBuy(skin.id)}
            onSelect={() => handleSelect(skin.id)}
          />
        ))}
      </div>
    </div>
  )
}
