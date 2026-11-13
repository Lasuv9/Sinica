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
  if (m.includes('SKIN_ALREADY_OWNED') || m.includes('REAL_MONEY_ONLY')) {
    return 'Этот скин уже куплен.'
  }
  if (m.includes('FAILED TO SEND') || m.includes('NETWORK') || m.includes('FETCH')) {
    return 'Не удалось связаться с сервером оплаты. Попробуй позже.'
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
        setPendingUsd((prev) => {
          const next = { ...prev }
          if (fresh.owned_skins?.includes('kind-bird')) next['kind-bird'] = false
          if (fresh.owned_skins?.includes('cosmic-bird')) next['cosmic-bird'] = false
          return next
        })
      }
    } catch (e) {
      console.warn('refresh user failed', e)
    }
  }, [setUser, user])

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

  /** Космическая — без изменений: через invoke create-cosmic-bird-payment */
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
        throw new Error(friendlyPaymentError(String(data?.code || data?.message || '')))
      }
      const rub =
        data.charge_amount != null
          ? `${data.charge_amount} ${data.charge_currency || 'RUB'}`
          : data.display_amount || ''
      const go = () => {
        setPendingUsd((p) => ({ ...p, 'cosmic-bird': true }))
        const tg = window.Telegram?.WebApp
        if (tg?.openLink) tg.openLink(data.pay_url)
        else window.open(data.pay_url, '_blank')
      }
      if (rub && window.Telegram?.WebApp?.showConfirm) {
        window.Telegram.WebApp.showConfirm(`К оплате: ${rub}\nПерейти к оплате?`, (ok) => {
          if (ok) go()
        })
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

  /**
   * Добрая Синица → явный POST /functions/v1/create-kind-bird-payment
   * body: { initData }
   * Скин выдаёт только webhook, не frontend.
   */
  const handleBuyKindBird = async () => {
    if (loading || owned.includes('kind-bird')) return

    const initData = getTelegramInitData()
    if (!initData) {
      window.Telegram?.WebApp?.showAlert('Открой Sinica через Telegram-бота')
      return
    }

    const base = import.meta.env.VITE_SUPABASE_URL
    const anon = import.meta.env.VITE_SUPABASE_ANON_KEY
    if (!base || !anon) {
      window.Telegram?.WebApp?.showAlert('Оплата временно недоступна')
      return
    }

    setLoading('kind-bird')
    try {
      const res = await fetch(`${base}/functions/v1/create-kind-bird-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${anon}`,
          apikey: anon,
        },
        body: JSON.stringify({ initData }),
      })

      let data: {
        success?: boolean
        pay_url?: string
        order_id?: string
        charge_amount?: number | string
        charge_currency?: string
        display_amount?: string
        code?: string
        message?: string
      } = {}

      try {
        data = await res.json()
      } catch {
        throw new Error('Не удалось прочитать ответ сервера оплаты')
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

      if (!res.ok && !data?.success) {
        throw new Error(
          friendlyPaymentError(String(data?.code || data?.message || res.status))
        )
      }

      if (!data?.success || !data?.pay_url) {
        throw new Error(
          friendlyPaymentError(String(data?.code || data?.message || ''))
        )
      }

      const rub =
        data.charge_amount != null
          ? `${data.charge_amount} ${data.charge_currency || 'RUB'}`
          : data.display_amount || ''

      const openPay = () => {
        setPendingUsd((p) => ({ ...p, 'kind-bird': true }))
        const tg = window.Telegram?.WebApp
        if (tg?.openLink) tg.openLink(data.pay_url!)
        else window.open(data.pay_url, '_blank')
      }

      if (rub && window.Telegram?.WebApp?.showConfirm) {
        window.Telegram.WebApp.showConfirm(
          `К оплате: ${rub}\nПерейти к оплате «Добрая Синица»?`,
          (ok) => {
            if (ok) openPay()
          }
        )
      } else {
        if (rub) window.Telegram?.WebApp?.showAlert?.(`К оплате: ${rub}`)
        openPay()
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

          const onBuy = () => {
            if (skin.id === 'kind-bird') return void handleBuyKindBird()
            if (skin.id === 'cosmic-bird') return void handleBuyCosmic()
            return void handleBuyCoins(skin.id)
          }

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
              onBuy={onBuy}
              onSelect={() => handleSelect(skin.id)}
            />
          )
        })}
      </div>
    </div>
  )
}
