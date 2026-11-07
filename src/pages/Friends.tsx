import { useState } from 'react'
import { User } from '@/types'
import { formatCoins } from '@/lib/utils'

interface FriendsProps {
  user: User
}

export function Friends({ user }: FriendsProps) {
  const [copied, setCopied] = useState(false)

  // В реальном приложении друзья приходят из БД по referral
  const friends: { name: string; coins: number }[] = []

  const inviteLink = `https://t.me/your_bot?start=ref_${user.telegram_id}`

  const copyLink = () => {
    navigator.clipboard.writeText(inviteLink).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const shareLink = () => {
    const tg = window.Telegram?.WebApp
    if (tg?.openTelegramLink) {
      const text = encodeURIComponent(
        `Присоединяйся ко мне в Синицу! 🐦\n${inviteLink}`
      )
      tg.openTelegramLink(`https://t.me/share/url?url=${inviteLink}&text=${text}`)
    } else {
      copyLink()
    }
  }

  return (
    <div className="page friends-page">
      <h1 className="page-title">Друзья</h1>
      <p className="page-subtitle">
        Приглашай друзей и получай бонусы
      </p>

      <div className="invite-card">
        <p>Твоя ссылка:</p>
        <code className="invite-link">{inviteLink}</code>
        <div className="invite-actions">
          <button className="btn btn-primary" onClick={shareLink}>
            Поделиться
          </button>
          <button className="btn btn-secondary" onClick={copyLink}>
            {copied ? 'Скопировано!' : 'Копировать'}
          </button>
        </div>
      </div>

      <div className="friends-list">
        <h2>Приглашённые ({friends.length})</h2>
        {friends.length === 0 ? (
          <p className="empty-state">Пока никого нет. Пригласи первого!</p>
        ) : (
          friends.map((f, i) => (
            <div key={i} className="friend-item">
              <span className="friend-name">{f.name}</span>
              <span className="friend-coins">{formatCoins(f.coins)} 💰</span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
