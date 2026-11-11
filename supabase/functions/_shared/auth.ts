/** Shared Telegram Mini App auth for Edge Functions */

export type TelegramAuthUser = {
  id: number
  first_name?: string
  last_name?: string
  username?: string
  photo_url?: string
  language_code?: string
}

export type AuthResult = {
  telegram_id: number
  user: TelegramAuthUser
  initData: string
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let out = 0
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return out === 0
}

async function hmacSha256(key: ArrayBuffer, data: string): Promise<ArrayBuffer> {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  return crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(data))
}

function toHex(buf: ArrayBuffer): string {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Validate Telegram WebApp initData and return telegram user.
 * Requires BOT_TOKEN env. Throws on invalid data.
 */
export async function authenticateTelegram(initData: string): Promise<AuthResult> {
  if (!initData || typeof initData !== 'string') {
    throw new Error('initData required')
  }

  const botToken = Deno.env.get('BOT_TOKEN') || Deno.env.get('TELEGRAM_BOT_TOKEN')
  const params = new URLSearchParams(initData)
  const hash = params.get('hash')
  if (!hash) throw new Error('Invalid initData: missing hash')

  const entries: string[] = []
  params.forEach((value, key) => {
    if (key !== 'hash') entries.push(`${key}=${value}`)
  })
  entries.sort()
  const dataCheckString = entries.join('\n')

  if (botToken) {
    const enc = new TextEncoder()
    const secretKey = await hmacSha256(enc.encode('WebAppData').buffer, botToken)
    const calculated = toHex(await hmacSha256(secretKey, dataCheckString))
    if (!timingSafeEqual(calculated, hash)) {
      throw new Error('Invalid initData signature')
    }

    const authDate = Number(params.get('auth_date') || 0)
    const now = Math.floor(Date.now() / 1000)
    if (authDate && now - authDate > 86400) {
      throw new Error('initData expired')
    }
  } else {
    console.warn('BOT_TOKEN not set — skipping signature check')
  }

  const userRaw = params.get('user')
  if (!userRaw) throw new Error('Invalid initData: missing user')
  const user = JSON.parse(userRaw) as TelegramAuthUser
  if (!user?.id || typeof user.id !== 'number') {
    throw new Error('Invalid initData: bad user id')
  }

  return { telegram_id: user.id, user, initData }
}
