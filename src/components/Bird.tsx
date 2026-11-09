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
    <button
      type="button"
      className={`bird-container ${isPopping ? 'popping' : ''}`}
      onClick={onTap}
      aria-label="Тапнуть синицу"
    >
      <div className="bird-coin">
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
          <div className="floating-reward">+1</div>
        </>
      )}
    </button>
  )
}
