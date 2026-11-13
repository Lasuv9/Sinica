import { Bird } from '@/components/Bird'
import { Balance } from '@/components/Balance'
import { BoostPanel } from '@/components/BoostPanel'
import { CosmicBackground } from '@/components/CosmicBackground'
import { KindBirdBackground } from '@/components/KindBirdBackground'
import { User } from '@/types'
import { useGame } from '@/hooks/useGame'

interface GameProps {
  user: User
  setUser: (u: User) => void
}

export function Game({ user, setUser }: GameProps) {
  const { fatLevel, isPopping, lastReward, multiplier, tap } = useGame(user, setUser)
  const isCosmic = user.current_skin === 'cosmic-bird'
  const isKind = user.current_skin === 'kind-bird'

  return (
    <div
      className={`page game-page ${isCosmic ? 'has-cosmic-bg' : ''} ${isKind ? 'has-kind-bg' : ''}`}
    >
      {isCosmic && <CosmicBackground />}
      {isKind && <KindBirdBackground />}

      <div className="game-foreground">
        <Balance coins={user.coins} totalTaps={user.total_taps} />

        <div className="game-area">
          <Bird
            skinId={user.current_skin}
            fatLevel={fatLevel}
            isPopping={isPopping}
            reward={lastReward || multiplier}
            onTap={tap}
          />
        </div>

        <div className="game-hint">
          {multiplier > 1 ? (
            <span className="boost-hint">Тап = +{multiplier} 💰</span>
          ) : isCosmic ? (
            <span className="cosmic-hint">Космическая синица в полёте</span>
          ) : isKind ? (
            <span className="kind-hint">Добрая синица у океана</span>
          ) : (
            <>Тапай по синице!</>
          )}
          {fatLevel > 0 && user.current_skin === 'default' && (
            <span className="fat-badge">Уровень толщины: {fatLevel}/4</span>
          )}
        </div>

        <div className="boost-dock">
          <BoostPanel user={user} setUser={setUser} />
        </div>
      </div>
    </div>
  )
}
