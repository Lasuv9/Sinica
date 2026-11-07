import { getSkinImage } from '@/lib/utils'

interface BirdProps {
  skinId: string
  fatLevel: number
  isPopping: boolean
  onTap: () => void
}

export function Bird({ skinId, fatLevel, isPopping, onTap }: BirdProps) {
  const src = getSkinImage(skinId, fatLevel)

  return (
    <div className="bird-container" onClick={onTap}>
      <img
        src={src}
        alt="Синица"
        className={`bird ${isPopping ? 'pop' : ''}`}
        draggable={false}
      />
      {isPopping && <div className="tap-effect">+1</div>}
    </div>
  )
}
