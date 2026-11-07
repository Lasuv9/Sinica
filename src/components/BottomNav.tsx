import { Page } from '@/types'

interface BottomNavProps {
  current: Page
  onChange: (page: Page) => void
}

const items: { id: Page; label: string; icon: string }[] = [
  { id: 'game', label: 'Игра', icon: '🐦' },
  { id: 'shop', label: 'Магазин', icon: '🛒' },
  { id: 'friends', label: 'Друзья', icon: '👥' },
  { id: 'profile', label: 'Профиль', icon: '👤' },
]

export function BottomNav({ current, onChange }: BottomNavProps) {
  return (
    <nav className="bottom-nav">
      {items.map((item) => (
        <button
          key={item.id}
          className={`nav-item ${current === item.id ? 'active' : ''}`}
          onClick={() => onChange(item.id)}
        >
          <span className="nav-icon">{item.icon}</span>
          <span className="nav-label">{item.label}</span>
        </button>
      ))}
    </nav>
  )
}
