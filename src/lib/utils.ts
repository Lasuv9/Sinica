import type { Skin } from '@/types'

/** Уровень "толстоты" синицы по tap_cycle (0–4) */
export function getFatLevel(tapCycle: number): number {
  return Math.max(0, Math.min(4, tapCycle))
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

/** Награда за тап */
export function getTapReward(_totalTaps: number): number {
  return 1
}

/** Временные улучшения монет (цены/длительность — отображение; сервер валидирует) */
export const BOOSTS = [
  { id: 'x2', name: 'X2', multiplier: 2, price: 500, durationSec: 300 },
  { id: 'x4', name: 'X4', multiplier: 4, price: 2000, durationSec: 300 },
  { id: 'x10', name: 'X10', multiplier: 10, price: 10000, durationSec: 300 },
  { id: 'x100', name: 'X100', multiplier: 100, price: 100000, durationSec: 300 },
] as const

export function getActiveMultiplier(
  boostExpiresAt?: string | null,
  boostMultiplier?: number | null
): number {
  if (!boostExpiresAt || !boostMultiplier) return 1
  if (new Date(boostExpiresAt).getTime() <= Date.now()) return 1
  return Math.max(1, Number(boostMultiplier) || 1)
}

export function formatBoostTime(msLeft: number): string {
  if (msLeft <= 0) return '0:00'
  const totalSec = Math.ceil(msLeft / 1000)
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return `${m}:${s.toString().padStart(2, '0')}`
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
  {
    id: 'ogr-mag',
    name: 'Огр Маг',
    image: '/images/skins/ogr-mag.png',
    price: 2000,
    description: 'Синица в стиле Огр Мага',
  },
  {
    id: 'cosmic-bird',
    name: 'Космическая Синица',
    image: '/images/skins/cosmic-bird.png',
    price: 0,
    description: 'Эксклюзив · $5.00 USD',
    payment: 'usd',
    usdPrice: 5,
    exclusive: true,
  },
] as Skin[]

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
