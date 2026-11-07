import { formatCoins } from '@/lib/utils'

interface HeaderProps {
  coins: number
  username?: string | null
}

export function Header({ coins, username }: HeaderProps) {
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
      </div>
    </header>
  )
}
