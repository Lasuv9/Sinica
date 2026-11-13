import { useCallback, useEffect, useState } from 'react'
import { User } from '@/types'
import { SKINS, haptic } from '@/lib/utils'
import { ShopItem } from '@/components/ShopItem'
import { authenticateUser, getTelegramInitData, supabase } from '@/lib/supabase'

interface ShopProps {
  user: User
  setUser: (u: User) => void
}

/** skin_id → Edge Function для RollyPay */
const USD_PAYMENT_FN: Record<string, string> = {
  'cosmic-bird': 'create-cosmic-bird-payment',
  'kind-bird': 'create-kind-bird-payment',
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
  if (m.includes('SKIN_ALREADY_OWNED') || m.includes('REAL_MONEY_ONLY')) {
    return 'Этот скин уже куплен или доступен только за реальные деньги.'
  }
  // Function not deployed / 404 looks like network error in supabase-js
  if (
    m.includes('PAYMENT_FUNCTION_UNAVAILABLE') ||
    m.includes('NOT FOUND') ||
    m.includes('404') ||
    m.includes('FUNCTIONSRELAYERROR') ||
    m.includes('FUNCTION NOT FOUND')
  ) {
    return 'Оплата «Доброй синицы» ещё не подключена на сервере. Напиши в поддержку или попробуй позже.'
  }
  if (m.includes('FAILED TO SEND') || m.includes('NETWORK') || m.includes('FETCH')) {
    return 'Не удалось связаться с сервером оплаты. Если интернет есть — функция оплаты, возможно, не задеплоена.'
  }
  return 'Не удалось начать оплату. Попробуй позже.'
}

export function Shop({ user, setUser }: ShopProps) {
  const [loading, setLoading] = useState<string | null>(null)
  const [pendingUsd, setPendingUsd] = useState<Record<string, boolean>>({})
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
        const nextPending = { ...pendingUsd }
        for (const id of Object.keys(USD_PAYMENT_FN)) {
          if (fresh.owned_skins?.includes(id)) nextPending[id] = false
        }
        setPendingUsd(nextPending)
      }
    } catch (e) {
      console.warn('refresh user failed', e)
    }
  }, [setUser, user, pendingUsd])

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') void refreshUser()
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

  const handleBuyUsd = async (skinId: string) => {
    if (loading || owned.includes(skinId)) return
    const fn = USD_PAYMENT_FN[skinId]
    if (!fn) {
      window.Telegram?.WebApp?.showAlert('Оплата для этого скина недоступна')
      return
    }

    const initData = getTelegramInitData()
    if (!initData) {
      window.Telegram?.WebApp?.showAlert('Открой Sinica через Telegram-бота')
      return
    }

    setLoading(skinId)
    try {
      const { data, error } = await supabase.functions.invoke(fn, {
        body: { initData },
      })

      if (error) {
        const em = String((error as { message?: string }).message || error)
        // supabase-js: missing Edge Function → "Failed to send a request to the Edge Function"
        if (
          /failed to send|not found|404|relay/i.test(em) &&
          fn.includes('kind-bird')
        ) {
          throw new Error('PAYMENT_FUNCTION_UNAVAILABLE')
        }
        throw new Error(em)
      }

      if (
        data?.code === 'SKIN_ALREADY_OWNED' ||
        String(data?.message || '').includes('SKIN_ALREADY_OWNED')
      ) {
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
        setPendingUsd((p) => ({ ...p, [skinId]: true }))
        const tg = window.Telegram?.WebApp
        if (tg?.openLink) tg.openLink(data.pay_url)
        else window.open(data.pay_url, '_blank')
      }

      if (rub && window.Telegram?.WebApp?.showConfirm) {
        window.Telegram.WebApp.showConfirm(
          `К оплате: ${rub}\nПерейти к оплате?`,
          (ok) => {
            if (ok) go()
          }
        )
      } else {
        if (rub) window.Telegram?.WebApp?.showAlert?.(`К оплате: ${rub}`)
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
          const isPending = isUsd && !!pendingUsd[skin.id] && !isOwned

          return (
            <ShopItem
              key={skin.id}
              skin={skin}
              owned={isOwned}
              current={user.current_skin === skin.id}
              canBuy={
                isUsd
                  ? loading === null
                  : user.coins >= skin.price && loading === null
              }
              pending={isPending}
              onBuy={() =>
                isUsd ? void handleBuyUsd(skin.id) : void handleBuyCoins(skin.id)
              }
              onSelect={() => handleSelect(skin.id)}
            />
          )
        })}
      </div>
    </div>
  )
}
