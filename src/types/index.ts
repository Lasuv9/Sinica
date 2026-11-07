export interface User {
  id: string
  telegram_id: number
  username: string | null
  first_name: string
  last_name: string | null
  avatar_url: string | null
  coins: number
  total_taps: number
  current_skin: string
  created_at: string
  updated_at: string
}

export interface Skin {
  id: string
  name: string
  image: string
  price: number
  description?: string
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
  fatLevel: number // 0-4
  currentSkin: string
  isPopping: boolean
}

export type Page = 'game' | 'shop' | 'friends' | 'profile'

export interface TapResponse {
  success: boolean
  coins: number
  total_taps: number
  reward: number
}

export interface BuySkinResponse {
  success: boolean
  coins: number
  current_skin: string
  message?: string
}
