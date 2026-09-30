import { useEffect, useRef } from 'react'
import lottie from 'lottie-web/build/player/lottie_light.js'

const pulse = {
  v: '5.7.4',
  fr: 30,
  ip: 0,
  op: 60,
  w: 64,
  h: 64,
  nm: 'Live pulse',
  ddd: 0,
  assets: [],
  layers: [
    {
      ddd: 0,
      ind: 1,
      ty: 4,
      nm: 'Pulse',
      sr: 1,
      ks: {
        o: { a: 0, k: 100 },
        r: { a: 0, k: 0 },
        p: { a: 0, k: [32, 32, 0] },
        a: { a: 0, k: [0, 0, 0] },
        s: { a: 0, k: [100, 100, 100] },
      },
      shapes: [
        {
          ty: 'gr',
          nm: 'Live dot',
          it: [
            {
              ty: 'el',
              p: { a: 0, k: [0, 0] },
              s: { a: 0, k: [22, 22] },
              nm: 'Dot',
            },
            {
              ty: 'fl',
              c: { a: 0, k: [0.5, 0.5, 0.5, 1] },
              o: { a: 0, k: 100 },
              nm: 'Neutral',
            },
            {
              ty: 'tr',
              p: { a: 0, k: [0, 0] },
              a: { a: 0, k: [0, 0] },
              s: {
                a: 1,
                k: [
                  {
                    t: 0,
                    s: [76, 76],
                    e: [112, 112],
                    i: { x: [0.67, 0.67], y: [1, 1] },
                    o: { x: [0.33, 0.33], y: [0, 0] },
                  },
                  {
                    t: 30,
                    s: [112, 112],
                    e: [76, 76],
                    i: { x: [0.67, 0.67], y: [1, 1] },
                    o: { x: [0.33, 0.33], y: [0, 0] },
                  },
                  { t: 60, s: [76, 76] },
                ],
              },
              r: { a: 0, k: 0 },
              o: { a: 0, k: 100 },
              sk: { a: 0, k: 0 },
              sa: { a: 0, k: 0 },
            },
          ],
        },
      ],
      ip: 0,
      op: 60,
      st: 0,
      bm: 0,
    },
  ],
}

export function LivePulse() {
  const container = useRef(null)
  useEffect(() => {
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
    const animation = lottie.loadAnimation({
      container: container.current,
      renderer: 'svg',
      animationData: pulse,
      autoplay: false,
      loop: true,
    })
    let visible = false
    const update = () => {
      if (motion.matches) animation.goToAndStop(0, true)
      else if (visible && document.visibilityState === 'visible')
        animation.play()
      else animation.pause()
    }
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting
      update()
    })
    observer.observe(container.current)
    motion.addEventListener('change', update)
    document.addEventListener('visibilitychange', update)
    return () => {
      observer.disconnect()
      motion.removeEventListener('change', update)
      document.removeEventListener('visibilitychange', update)
      animation.destroy()
    }
  }, [])
  return <span ref={container} className="st-live-pulse" aria-hidden="true" />
}
