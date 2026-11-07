import { User } from '@/types'
import { formatCoins, getFatLevel, SKINS } from '@/lib/utils'

interface ProfileProps {
  user: User
}

export function Profile({ user }: ProfileProps) {
  const fatLevel = getFatLevel(user.tap_cycle ?? 0)
  const skin = SKINS.find((s) => s.id === user.current_skin)

  return (
    <div className="page profile-page">
      <h1 className="page-title">Профиль</h1>

      <div className="profile-card">
        <div className="profile-avatar">
          {user.avatar_url ? (
            <img src={user.avatar_url} alt="" />
          ) : (
            <div className="avatar-placeholder">🐦</div>
          )}
        </div>

        <h2 className="profile-name">
          {user.first_name}
          {user.last_name ? ` ${user.last_name}` : ''}
        </h2>
        {user.username && (
          <p className="profile-username">@{user.username}</p>
        )}
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <span className="stat-value">{formatCoins(user.coins)}</span>
          <span className="stat-label">Монеты</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{formatCoins(user.total_taps)}</span>
          <span className="stat-label">Всего тапов</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{fatLevel}/4</span>
          <span className="stat-label">Толщина</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{skin?.name || 'Обычная'}</span>
          <span className="stat-label">Скин</span>
        </div>
      </div>

      <div className="profile-info">
        <p>
          <strong>Telegram ID:</strong> {user.telegram_id}
        </p>
        <p>
          <strong>В игре с:</strong>{' '}
          {new Date(user.created_at).toLocaleDateString('ru-RU')}
        </p>
      </div>
    </div>
  )
}
