import { Bird } from '@/components/Bird'
import { Balance } from '@/components/Balance'
import { BoostPanel } from '@/components/BoostPanel'
import { User } from '@/types'
import { useGame } from '@/hooks/useGame'

interface GameProps {
  user: User
  setUser: (u: User) => void
}

export function Game({ user, setUser }: GameProps) {
  const { fatLevel, isPopping, multiplier, tap } = useGame(user, setUser)

  return (
    <div className="page game-page">
      <Balance coins={user.coins} totalTaps={user.total_taps} />

      <div className="game-area">
        <Bird
          skinId={user.current_skin}
          fatLevel={fatLevel}
          isPopping={isPopping}
          onTap={tap}
        />
      </div>

      <div className="game-hint">
        {multiplier > 1 ? (
          <span className="boost-hint">Тап = ×{multiplier} монет</span>
        ) : (
          <>Тапай по синице!</>
        )}
        {fatLevel > 0 && (
          <span className="fat-badge">Уровень толщины: {fatLevel}/4</span>
        )}
      </div>

      <BoostPanel user={user} setUser={setUser} />
    </div>
  )
}
