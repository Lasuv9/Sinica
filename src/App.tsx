import { useState } from 'react'
import { useUser } from '@/hooks/useUser'
import { Header } from '@/components/Header'
import { BottomNav } from '@/components/BottomNav'
import { Game } from '@/pages/Game'
import { Shop } from '@/pages/Shop'
import { Friends } from '@/pages/Friends'
import { Profile } from '@/pages/Profile'
import { Page } from '@/types'

export default function App() {
  const { user, loading, error, setUser } = useUser()
  const [page, setPage] = useState<Page>('game')

  if (loading) {
    return (
      <div className="app loading-screen">
        <div className="loader">🐦</div>
        <p>Загрузка...</p>
      </div>
    )
  }

  if (error || !user) {
    return (
      <div className="app error-screen">
        <p>Ошибка: {error || 'Пользователь не найден'}</p>
        <button className="btn btn-primary" onClick={() => window.location.reload()}>
          Обновить
        </button>
      </div>
    )
  }

  return (
    <div className="app">
      <Header
        coins={user.coins}
        username={user.username}
        showTelegram={page === 'game'}
      />

      <main className="main">
        {page === 'game' && <Game user={user} setUser={setUser} />}
        {page === 'shop' && <Shop user={user} setUser={setUser} />}
        {page === 'friends' && <Friends user={user} />}
        {page === 'profile' && <Profile user={user} />}
      </main>

      <BottomNav current={page} onChange={setPage} />
    </div>
  )
}
