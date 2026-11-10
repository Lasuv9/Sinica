import { formatCoins } from '@/lib/utils'

interface HeaderProps {
  coins: number
  username?: string | null
  showTelegram?: boolean
}

export function Header({ coins, username, showTelegram = false }: HeaderProps) {
  return (
    <header className="header">
      <div className="header-left">
        <span className="logo">🐦 Синица</span>
        {username && <span className="username">@{username}</span>}
      </div>
      <div className="header-right">
        <div className="coins-badge">
          <span className="coin-icon">💰</span>
          <span className="coins-value">{formatCoins(coins)}</span>
        </div>
        {showTelegram && (
          <a
            className="telegram-subscribe"
            href="https://t.me/sinicagame"
            target="_blank"
            rel="noreferrer noopener"
            aria-label="Подписаться на Telegram-канал"
            title="Подписаться на Telegram-канал"
          >
            <span aria-hidden="true">✈</span>
            <span>Подписаться</span>
          </a>
        )}
      </div>
    </header>
  )
}
