import { useCallback, useEffect, useState } from 'react'
import { User } from '@/types'
import { SKINS, haptic } from '@/lib/utils'
import { ShopItem } from '@/components/ShopItem'
import { authenticateUser, getTelegramInitData, supabase } from '@/lib/supabase'

interface ShopProps {
  user: User
  setUser: (u: User) => void
}

function friendlyPaymentError(codeOrMessage: string): string {
  const m = codeOrMessage.toUpperCase()
  if (m.includes('ROLLYPAY_NOT_CONFIGURED')) {
    return 'Оплата временно недоступна. Попробуй позже.'
  }
  if (m.includes('ROLLYPAY_RATE_UNAVAILABLE')) {
    return 'Не удалось получить курс. Попробуй позже.'
  }
  if (m.includes('ROLLYPAY_PAYMENT_CREATE_FAILED')) {
    return 'Не удалось создать платёж. Попробуй ещё раз.'
  }
  if (m.includes('SKIN_ALREADY_OWNED')) {
    return 'Этот скин уже куплен.'
  }
  if (m.includes('FAILED TO SEND') || m.includes('NETWORK') || m.includes('FETCH')) {
    return 'Нет связи. Проверь интернет и попробуй снова.'
  }
  return 'Не удалось начать оплату. Попробуй позже.'
}

export function Shop({ user, setUser }: ShopProps) {
  const [loading, setLoading] = useState<string | null>(null)
  const [pendingCosmic, setPendingCosmic] = useState(false)
  const owned = user.owned_skins || ['default']

  const refreshUser = useCallback(async () => {
    try {
      const { user: fresh } = await authenticateUser()
      if (fresh) {
        setUser({
          ...user,
          ...fresh,
          owned_skins: fresh.owned_skins || user.owned_skins,
        })
        if (fresh.owned_skins?.includes('cosmic-bird')) {
          setPendingCosmic(false)
        }
      }
    } catch (e) {
      console.warn('refresh user failed', e)
    }
  }, [setUser, user])

  // После возврата из оплаты / фокус окна
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        void refreshUser()
      }
    }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', onVisible)
    void refreshUser()
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', onVisible)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleBuyCoins = async (skinId: string) => {
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

  const handleBuyCosmic = async () => {
    if (loading || owned.includes('cosmic-bird')) return

    const initData = getTelegramInitData()
    if (!initData) {
      window.Telegram?.WebApp?.showAlert('Открой Sinica через Telegram-бота')
      return
    }

    setLoading('cosmic-bird')
    try {
      const { data, error } = await supabase.functions.invoke(
        'create-cosmic-bird-payment',
        { body: { initData } }
      )

      if (error) throw error

      if (data?.code === 'SKIN_ALREADY_OWNED' || data?.message?.includes?.('SKIN_ALREADY_OWNED')) {
        await refreshUser()
        haptic('success')
        window.Telegram?.WebApp?.showAlert('Скин уже куплен')
        return
      }

      if (!data?.success || !data?.pay_url) {
        const code = data?.code || data?.message || ''
        throw new Error(friendlyPaymentError(String(code)))
      }

      const rub =
        data.charge_amount != null
          ? `${data.charge_amount} ${data.charge_currency || 'RUB'}`
          : data.display_amount || ''

      const go = () => {
        setPendingCosmic(true)
        const tg = window.Telegram?.WebApp
        if (tg?.openLink) {
          tg.openLink(data.pay_url)
        } else if (tg?.openTelegramLink && String(data.pay_url).includes('t.me')) {
          tg.openTelegramLink(data.pay_url)
        } else {
          window.open(data.pay_url, '_blank')
        }
      }

      if (rub) {
        window.Telegram?.WebApp?.showConfirm?.(
          `К оплате: ${rub}\nПерейти к оплате?`,
          (ok) => {
            if (ok) go()
          }
        )
        // Fallback if showConfirm missing
        if (!window.Telegram?.WebApp?.showConfirm) {
          window.Telegram?.WebApp?.showAlert?.(`К оплате: ${rub}`)
          go()
        }
      } else {
        go()
      }
    } catch (e) {
      console.error(e)
      haptic('error')
      window.Telegram?.WebApp?.showAlert(
        e instanceof Error ? friendlyPaymentError(e.message) : 'Ошибка оплаты'
      )
    } finally {
      setLoading(null)
    }
  }

  const handleSelect = async (skinId: string) => {
    if (loading || !owned.includes(skinId)) return
    setLoading(skinId)
    setUser({ ...user, current_skin: skinId })
    haptic('light')
    try {
      await supabase.functions.invoke('equip-skin', {
        body: { initData: getTelegramInitData(), skin_id: skinId },
      })
    } catch (e) {
      console.warn('equip-skin sync failed', e)
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="page shop-page">
      <h1 className="page-title">Магазин</h1>
      <p className="page-subtitle">Покупай скины для синицы</p>
      <div className="shop-list">
        {SKINS.map((skin) => {
          const isUsd = skin.payment === 'usd'
          const isOwned = owned.includes(skin.id) || (!isUsd && skin.price === 0)
          const isCosmicPending =
            isUsd && skin.id === 'cosmic-bird' && pendingCosmic && !isOwned

          return (
            <ShopItem
              key={skin.id}
              skin={skin}
              owned={isOwned}
              current={user.current_skin === skin.id}
              canBuy={isUsd ? loading === null : user.coins >= skin.price && loading === null}
              pending={isCosmicPending}
              onBuy={() =>
                isUsd ? void handleBuyCosmic() : void handleBuyCoins(skin.id)
              }
              onSelect={() => handleSelect(skin.id)}
            />
          )
        })}
      </div>
    </div>
  )
}
