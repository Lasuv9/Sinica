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
  const [pendingLabel, setPendingLabel] = useState<string | null>(null)
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
    }, 250)
    return () => window.clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expiresAt, user.id])

  const buy = async (mult: number, price: number, name: string) => {
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

    // Мгновенный UI-фидбек до ответа сервера
    setBuying(mult)
    setPendingLabel(`Активируем ${name}…`)
    haptic('light')

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

      const exp = data.boost_expires_at ?? null
      const m = data.multiplier ?? mult

      setUser({
        ...user,
        coins: typeof data.coins === 'number' ? data.coins : user.coins - price,
        boost_multiplier: m,
        boost_expires_at: exp,
        active_boost: exp ? { multiplier: m, expires_at: exp } : null,
      })
      setPendingLabel(`${name} активен!`)
      haptic('success')
      window.setTimeout(() => setPendingLabel(null), 1200)
    } catch (e) {
      console.error(e)
      haptic('error')
      setPendingLabel(null)
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
        <div className="boost-title-wrap">
          <span className="boost-title-icon">⚡</span>
          <h2 className="boost-title">Улучшения</h2>
        </div>
        {isActive ? (
          <span className="boost-active-badge">
            ×{multiplier} · {formatBoostTime(msLeft)}
          </span>
        ) : (
          <span className="boost-idle-badge">×1</span>
        )}
      </div>

      {pendingLabel && (
        <div className="boost-pending">{pendingLabel}</div>
      )}

      <div className="boost-grid">
        {BOOSTS.map((b) => {
          const activeThis = isActive && multiplier === b.multiplier
          const canBuy = user.coins >= b.price && buying === null
          return (
            <div
              key={b.id}
              className={`boost-card ${activeThis ? 'active' : ''} ${buying === b.multiplier ? 'buying' : ''}`}
            >
              <div className="boost-card-top">
                <span className="boost-name">{b.name}</span>
                <span className="boost-mult">×{b.multiplier}</span>
              </div>
              <div className="boost-meta">
                <span>5 мин</span>
                <span className="boost-price">{formatCoins(b.price)} 💰</span>
              </div>
              {activeThis ? (
                <div className="boost-timer-bar">
                  <div
                    className="boost-timer-fill"
                    style={{
                      width: `${Math.max(0, Math.min(100, (msLeft / 300000) * 100))}%`,
                    }}
                  />
                  <span className="boost-timer-text">{formatBoostTime(msLeft)}</span>
                </div>
              ) : (
                <button
                  className="btn btn-primary boost-btn"
                  disabled={!canBuy}
                  onClick={() => void buy(b.multiplier, b.price, b.name)}
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
