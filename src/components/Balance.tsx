import { memo } from 'react'
import { formatCoins } from '@/lib/utils'

interface BalanceProps {
  coins: number
  totalTaps: number
}

function BalanceInner({ coins, totalTaps }: BalanceProps) {
  return (
    <div className="balance-card">
      <div className="balance-item">
        <span className="balance-label">Монеты</span>
        <span className="balance-value">{formatCoins(coins)}</span>
      </div>
      <div className="balance-divider" />
      <div className="balance-item">
        <span className="balance-label">Тапов</span>
        <span className="balance-value">{formatCoins(totalTaps)}</span>
      </div>
    </div>
  )
}

export const Balance = memo(BalanceInner)
