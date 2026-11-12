export interface ActiveBoost {
  multiplier: number
  expires_at: string
}

export interface User {
  id: string
  telegram_id: number
  username: string | null
  first_name: string
  last_name: string | null
  avatar_url: string | null
  coins: number
  total_taps: number
  tap_cycle: number
  current_skin: string
  owned_skins?: string[]
  active_boost?: ActiveBoost | null
  boost_multiplier?: number
  boost_expires_at?: string | null
  created_at: string
  updated_at: string
}

export interface Skin {
  id: string
  name: string
  image: string
  price: number
  description?: string
  /** Real-money exclusive (e.g. RollyPay) */
  payment?: 'coins' | 'usd'
  usdPrice?: number
  exclusive?: boolean
}

export interface BoostOffer {
  id: string
  name: string
  multiplier: number
  price: number
  durationSec: number
}

export interface Friend {
  id: string
  username: string | null
  first_name: string
  avatar_url: string | null
  coins: number
  invited_at: string
}

export interface GameState {
  coins: number
  totalTaps: number
  fatLevel: number
  currentSkin: string
  isPopping: boolean
}

export interface TapResponse {
  success: boolean
  coins: number
  total_taps: number
  tap_cycle: number
  popped: boolean
  reward: number
  multiplier?: number
  boost_expires_at?: string | null
}

export interface BuySkinResponse {
  success: boolean
  coins: number
  current_skin: string
  message?: string
}

export type Page = 'game' | 'shop' | 'friends' | 'profile'

declare global {
  interface Window {
    Telegram?: {
      WebApp: {
        initData: string
        initDataUnsafe: {
          user?: {
            id: number
            first_name: string
            last_name?: string
            username?: string
            photo_url?: string
          }
        }
        ready: () => void
        expand: () => void
        setHeaderColor: (color: string) => void
        setBackgroundColor: (color: string) => void
        HapticFeedback?: {
          impactOccurred: (style: string) => void
          notificationOccurred: (type: string) => void
        }
        openTelegramLink: (url: string) => void
        openLink: (url: string) => void
        showAlert: (message: string) => void
        showConfirm: (message: string, callback: (ok: boolean) => void) => void
      }
    }
  }
}

export {}
