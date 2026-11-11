import { useEffect, useState } from 'react'
import { User } from '@/types'
import { BOOSTS, formatBoostTime, formatCoins, getActiveMultiplier, haptic } from '@/lib/utils'
import { getTelegramInitData, supabase } from '@/lib/supabase'

interface BoostPanelProps {
  user: User
  setUser: (u: User) => void
}

export function BoostPanel({ user, setUser }: BoostPanelProps) {
  const [buying, setBuying] = useState<number | null>(null)
  const [, setTick] = useState(0)

  const expiresAt = user.boost_expires_at || user.active_boost?.expires_at || null
  const multiplier = getActiveMultiplier(
    expiresAt,
    user.boost_multiplier ?? user.active_boost?.multiplier
  )
  const msLeft = expiresAt ? new Date(expiresAt).getTime() - Date.now() : 0
  const isActive = multiplier > 1 && msLeft > 0

  useEffect(() => {
    if (!expiresAt) return
    const id = window.setInterval(() => {
      const left = new Date(expiresAt).getTime() - Date.now()
      if (left <= 0) {
        setUser({
          ...user,
          boost_multiplier: 1,
          boost_expires_at: null,
          active_boost: null,
        })
      }
      setTick((t) => t + 1)
    }, 1000)
    return () => window.clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expiresAt, user.id])

  const buy = async (mult: number, price: number) => {
    if (buying) return
    if (user.coins < price) {
      haptic('error')
      window.Telegram?.WebApp?.showAlert('Недостаточно монет')
      return
    }

    const initData = getTelegramInitData()
    if (!initData) {
      window.Telegram?.WebApp?.showAlert('Открой Sinica через Telegram-бота')
      return
    }

    setBuying(mult)
    try {
      const { data, error } = await supabase.functions.invoke('buy-boost', {
        body: {
          initData,
          multiplier: mult,
          request_id: crypto.randomUUID(),
        },
      })

      if (error) throw error
      if (!data?.success) {
        throw new Error(data?.message || 'Не удалось купить улучшение')
      }

      setUser({
        ...user,
        coins: typeof data.coins === 'number' ? data.coins : user.coins,
        boost_multiplier: data.multiplier ?? mult,
        boost_expires_at: data.boost_expires_at ?? null,
        active_boost: data.boost_expires_at
          ? { multiplier: data.multiplier ?? mult, expires_at: data.boost_expires_at }
          : null,
      })
      haptic('success')
    } catch (e) {
      console.error(e)
      haptic('error')
      window.Telegram?.WebApp?.showAlert(
        e instanceof Error ? e.message : 'Ошибка покупки улучшения'
      )
    } finally {
      setBuying(null)
    }
  }

  return (
    <div className="boost-panel">
      <div className="boost-panel-header">
        <h2 className="boost-title">Улучшения</h2>
        {isActive ? (
          <span className="boost-active-badge">
            Активно ×{multiplier} · {formatBoostTime(msLeft)}
          </span>
        ) : (
          <span className="boost-idle-badge">×1 обычный режим</span>
        )}
      </div>

      <div className="boost-grid">
        {BOOSTS.map((b) => {
          const activeThis = isActive && multiplier === b.multiplier
          const canBuy = user.coins >= b.price && buying === null
          return (
            <div
              key={b.id}
              className={`boost-card ${activeThis ? 'active' : ''}`}
            >
              <div className="boost-card-top">
                <span className="boost-name">{b.name}</span>
                <span className="boost-mult">×{b.multiplier}</span>
              </div>
              <div className="boost-meta">5 мин · {formatCoins(b.price)} 💰</div>
              {activeThis ? (
                <button className="btn btn-secondary boost-btn" disabled>
                  {formatBoostTime(msLeft)}
                </button>
              ) : (
                <button
                  className="btn btn-primary boost-btn"
                  disabled={!canBuy || buying === b.multiplier}
                  onClick={() => void buy(b.multiplier, b.price)}
                >
                  {buying === b.multiplier ? '…' : 'Купить'}
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
