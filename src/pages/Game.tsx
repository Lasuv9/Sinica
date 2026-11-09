import { Bird } from '@/components/Bird'
import { Balance } from '@/components/Balance'
import { User } from '@/types'
import { useGame } from '@/hooks/useGame'

interface GameProps {
  user: User
  setUser: (u: User) => void
}

export function Game({ user, setUser }: GameProps) {
  const { fatLevel, isPopping, tap } = useGame(user, setUser)

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
        Тапай по синице!
        {fatLevel > 0 && (
          <span className="fat-badge">Уровень толщины: {fatLevel}/4</span>
        )}
      </div>
    </div>
  )
}
