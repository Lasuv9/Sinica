import { useRef, useState } from 'react'
import { getSkinImage } from '@/lib/utils'

interface BirdProps {
  skinId: string
  fatLevel: number
  isPopping: boolean
  reward?: number
  onTap: () => void
}

export function Bird({ skinId, fatLevel, isPopping, reward = 1, onTap }: BirdProps) {
  const src = getSkinImage(skinId, fatLevel)
  const [pressed, setPressed] = useState(false)
  const [tilt, setTilt] = useState({ x: 0, y: 0 })
  const coinRef = useRef<HTMLDivElement>(null)

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault()
    const el = coinRef.current
    if (el) {
      const rect = el.getBoundingClientRect()
      const cx = rect.left + rect.width / 2
      const cy = rect.top + rect.height / 2
      // normalize -1..1
      const nx = Math.max(-1, Math.min(1, (e.clientX - cx) / (rect.width / 2)))
      const ny = Math.max(-1, Math.min(1, (e.clientY - cy) / (rect.height / 2)))
      // tilt toward finger: rotateX from vertical, rotateY from horizontal
      setTilt({
        x: -ny * 18, // finger lower → tilt away from user on bottom
        y: nx * 18,
      })
    }
    setPressed(true)
    onTap()
  }

  const clearPress = () => {
    setPressed(false)
    setTilt({ x: 0, y: 0 })
  }

  return (
    <button
      type="button"
      className={`bird-container ${isPopping ? 'popping' : ''} ${pressed ? 'pressed' : ''}`}
      onPointerDown={handlePointerDown}
      onPointerUp={clearPress}
      onPointerCancel={clearPress}
      onPointerLeave={clearPress}
      aria-label="Тапнуть синицу"
    >
      <div
        ref={coinRef}
        className="bird-coin"
        style={
          {
            '--tilt-x': `${tilt.x}deg`,
            '--tilt-y': `${tilt.y}deg`,
          } as React.CSSProperties
        }
      >
        <div className="bird-coin-ring" />
        <div className="bird-coin-inner">
          <img
            src={src}
            alt="Синица"
            className={`bird ${isPopping ? 'pop' : ''}`}
            draggable={false}
          />
        </div>
        <div className="bird-coin-shine" />
      </div>

      {isPopping && (
        <>
          <span className="spark s1" />
          <span className="spark s2" />
          <span className="spark s3" />
          <span className="spark s4" />
          <span className="spark s5" />
          <span className="spark s6" />
          <span className="spark s7" />
          <span className="spark s8" />
          <div className={`floating-reward ${reward > 1 ? 'big' : ''}`}>
            +{reward}
          </div>
        </>
      )}
    </button>
  )
}
