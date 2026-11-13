import { useEffect, useState } from 'react'

/**
 * Фон только для скина kind-bird («Добрая Синица»).
 * Статичная картинка + лёгкие волны, без тяжёлого blur.
 */
export function KindBirdBackground() {
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    const onVis = () => setPaused(document.visibilityState !== 'visible')
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [])

  return (
    <div className={`kind-bird-bg ${paused ? 'paused' : ''}`} aria-hidden>
      <div
        className="kind-bird-bg-image"
        style={{ backgroundImage: "url('/images/backgrounds/kind-bird-bg.jpg')" }}
      />
      <div className="kind-bird-wave w1" />
      <div className="kind-bird-wave w2" />
      <div className="kind-bird-sparkle s1" />
      <div className="kind-bird-sparkle s2" />
      <div className="kind-bird-bg-scrim" />
      <div className="kind-bird-badge">Добрая синица у океана</div>
    </div>
  )
}
