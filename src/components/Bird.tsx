import { memo, useCallback, useRef } from 'react'
import { getSkinImage } from '@/lib/utils'

interface BirdProps {
  skinId: string
  fatLevel: number
  isPopping: boolean
  reward?: number
  onTap: () => void
}

function BirdInner({ skinId, fatLevel, isPopping, reward = 1, onTap }: BirdProps) {
  const src = getSkinImage(skinId, fatLevel)
  const btnRef = useRef<HTMLButtonElement>(null)
  const coinRef = useRef<HTMLDivElement>(null)

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault()
      const btn = btnRef.current
      const coin = coinRef.current
      if (btn) btn.classList.add('pressed')
      if (coin) {
        const rect = coin.getBoundingClientRect()
        const nx = Math.max(-1, Math.min(1, (e.clientX - (rect.left + rect.width / 2)) / (rect.width / 2)))
        const ny = Math.max(-1, Math.min(1, (e.clientY - (rect.top + rect.height / 2)) / (rect.height / 2)))
        coin.style.setProperty('--tilt-x', `${(-ny * 14).toFixed(1)}deg`)
        coin.style.setProperty('--tilt-y', `${(nx * 14).toFixed(1)}deg`)
      }
      onTap()
    },
    [onTap]
  )

  const clearPress = useCallback(() => {
    btnRef.current?.classList.remove('pressed')
    const coin = coinRef.current
    if (coin) {
      coin.style.setProperty('--tilt-x', '0deg')
      coin.style.setProperty('--tilt-y', '0deg')
    }
  }, [])

  return (
    <button
      ref={btnRef}
      type="button"
      className={`bird-container ${isPopping ? 'popping' : ''}`}
      onPointerDown={handlePointerDown}
      onPointerUp={clearPress}
      onPointerCancel={clearPress}
      onPointerLeave={clearPress}
      aria-label="Тапнуть синицу"
    >
      <div ref={coinRef} className="bird-coin">
        <div className="bird-coin-ring" />
        <div className="bird-coin-inner">
          <img src={src} alt="Синица" className="bird" draggable={false} />
        </div>
        <div className="bird-coin-shine" />
      </div>

      {isPopping && (
        <>
          <span className="spark s1" />
          <span className="spark s2" />
          <span className="spark s3" />
          <div className={`floating-reward ${reward > 1 ? 'big' : ''}`}>+{reward}</div>
        </>
      )}
    </button>
  )
}

export const Bird = memo(BirdInner)
