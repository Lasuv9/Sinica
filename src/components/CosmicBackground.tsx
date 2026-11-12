import { useEffect, useState } from 'react'

/** Lightweight space background — fewer layers, no heavy blur */
export function CosmicBackground() {
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    const onVis = () => setPaused(document.visibilityState !== 'visible')
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [])

  return (
    <div className={`cosmic-bg ${paused ? 'paused' : ''}`} aria-hidden>
      <div className="cosmic-stars" />
      <div className="cosmic-glow g-a" />
      <div className="cosmic-glow g-b" />
      <div className="black-hole bh1" />
      <div className="meteor m1" />
      <div className="meteor m2" />
      <div className="cosmic-scrim" />
    </div>
  )
}
