/** Вычисляет уровень "толстоты" синицы по количеству тапов */
export function getFatLevel(totalTaps: number): number {
  if (totalTaps >= 10000) return 4
  if (totalTaps >= 3000) return 3
  if (totalTaps >= 1000) return 2
  if (totalTaps >= 300) return 1
  return 0
}

/** Форматирует число монет */
export function formatCoins(coins: number): string {
  if (coins >= 1_000_000) {
    return (coins / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M'
  }
  if (coins >= 1_000) {
    return (coins / 1_000).toFixed(1).replace(/\.0$/, '') + 'K'
  }
  return coins.toString()
}

/** Награда за тап (с небольшим рандомом) */
export function getTapReward(totalTaps: number): number {
  const base = 1
  const bonus = Math.floor(totalTaps / 5000) // +1 за каждые 5к тапов
  return base + bonus
}

/** Список доступных скинов */
export const SKINS = [
  {
    id: 'default',
    name: 'Обычная',
    image: '/images/bird.png',
    price: 0,
    description: 'Классическая синица',
  },
  {
    id: 'chekushka',
    name: 'Чекушка',
    image: '/images/skins/chekushka.png',
    price: 500,
    description: 'Синица с чекушкой',
  },
  {
    id: 'melstroy',
    name: 'Мелстрой',
    image: '/images/skins/melstroy.png',
    price: 1500,
    description: 'Синица в стиле Мелстроя',
  },
] as const

export function getSkinImage(skinId: string, fatLevel: number): string {
  if (skinId !== 'default') {
    const skin = SKINS.find((s) => s.id === skinId)
    return skin?.image || '/images/bird.png'
  }

  // Для обычной синицы меняем картинку по уровню толщины
  if (fatLevel === 0) return '/images/bird.png'
  if (fatLevel >= 4) return '/images/bird-fat-4.png'
  return `/images/bird-fat-${fatLevel}.png`
}

export function playPopSound() {
  try {
    const audio = new Audio('/images/sounds/pop.mp3')
    audio.volume = 0.4
    audio.play().catch(() => {})
  } catch {
    // ignore
  }
}

/** Haptic feedback через Telegram */
export function haptic(type: 'light' | 'medium' | 'heavy' | 'success' | 'error' = 'light') {
  try {
    const tg = (window as any).Telegram?.WebApp
    if (!tg?.HapticFeedback) return

    if (type === 'success') {
      tg.HapticFeedback.notificationOccurred('success')
    } else if (type === 'error') {
      tg.HapticFeedback.notificationOccurred('error')
    } else {
      tg.HapticFeedback.impactOccurred(type)
    }
  } catch {
    // ignore
  }
}
