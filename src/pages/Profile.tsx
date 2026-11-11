import { useState } from 'react'
import { User } from '@/types'
import { formatCoins, getFatLevel, SKINS } from '@/lib/utils'
import { Modal } from '@/components/Modal'
import {
  PRIVACY_POLICY_FOOTER,
  PRIVACY_POLICY_SECTIONS,
  PRIVACY_POLICY_UPDATED,
} from '@/lib/privacyPolicy'

const CHANNEL_URL = 'https://t.me/sinicagame'

interface ProfileProps {
  user: User
}

function openChannel() {
  const tg = window.Telegram?.WebApp
  if (tg?.openTelegramLink) {
    tg.openTelegramLink(CHANNEL_URL)
  } else {
    window.open(CHANNEL_URL, '_blank')
  }
}

export function Profile({ user }: ProfileProps) {
  const [privacyOpen, setPrivacyOpen] = useState(false)
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

      <button type="button" className="btn btn-primary channel-btn" onClick={openChannel}>
        📢 Подписаться на канал
      </button>

      <button
        type="button"
        className="btn btn-secondary channel-btn privacy-btn"
        onClick={() => setPrivacyOpen(true)}
      >
        🔒 Политика конфиденциальности
      </button>

      <div className="profile-info">
        <p>
          <strong>Telegram ID:</strong> {user.telegram_id}
        </p>
        <p>
          <strong>В игре с:</strong>{' '}
          {new Date(user.created_at).toLocaleDateString('ru-RU')}
        </p>
      </div>

      <Modal
        open={privacyOpen}
        onClose={() => setPrivacyOpen(false)}
        title="Политика конфиденциальности"
      >
        <div className="privacy-content">
          <p className="privacy-updated">
            Дата последнего обновления: {PRIVACY_POLICY_UPDATED}
          </p>
          {PRIVACY_POLICY_SECTIONS.map((section) => (
            <section key={section.title} className="privacy-section">
              <h3>{section.title}</h3>
              {section.body.map((line, i) => (
                <p key={`${section.title}-${i}`}>{line}</p>
              ))}
            </section>
          ))}
          <p className="privacy-footer">{PRIVACY_POLICY_FOOTER}</p>
          <button
            type="button"
            className="btn btn-primary channel-btn"
            onClick={openChannel}
          >
            Открыть канал поддержки
          </button>
        </div>
      </Modal>
    </div>
  )
}
