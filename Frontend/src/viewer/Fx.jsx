import { useEffect, useLayoutEffect, useRef } from 'react'
import gsap from 'gsap'

const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

// Segmented toggle whose thumb glides to the selected option.
export function SegToggle({ options, value, onChange, label }) {
  const root = useRef(null)
  const thumb = useRef(null)
  const first = useRef(true)
  useLayoutEffect(() => {
    const selected = root.current.querySelector('[aria-checked="true"]')
    if (!selected) return
    const to = { x: selected.offsetLeft, width: selected.offsetWidth, height: selected.offsetHeight }
    if (first.current || reduced()) { gsap.set(thumb.current, to); first.current = false }
    else gsap.to(thumb.current, { ...to, duration: .45, ease: 'power3.out', overwrite: true })
  }, [value])
  return <div ref={root} className="st-seg" role="radiogroup" aria-label={label}>
    <span ref={thumb} className="st-seg-thumb" aria-hidden="true" />
    {options.map(([key, text]) => <button key={key} type="button" role="radio" aria-checked={value === key} onClick={() => onChange(key)}>{text}</button>)}
  </div>
}

// Number that counts up/down to its new value whenever it changes.
export function CountUp({ value, decimals = 0, suffix = '' }) {
  const node = useRef(null)
  const shown = useRef({ n: value })
  useEffect(() => {
    if (reduced()) { shown.current.n = value; node.current.textContent = value.toFixed(decimals) + suffix; return }
    const tween = gsap.to(shown.current, { n: value, duration: .8, ease: 'power3.out', onUpdate: () => { node.current.textContent = shown.current.n.toFixed(decimals) + suffix } })
    return () => tween.kill()
  }, [value, decimals, suffix])
  return <span ref={node}>{value.toFixed(decimals)}{suffix}</span>
}

// Horizontal bar whose fill animates to a percentage.
export function AnimatedBar({ percent, className = '' }) {
  const fill = useRef(null)
  useEffect(() => { gsap.to(fill.current, { width: `${percent}%`, duration: reduced() ? 0 : 1, ease: 'power3.out' }) }, [percent])
  return <div className={`st-abar ${className}`}><span ref={fill} /></div>
}

const CELEBRATED = ['four', 'six', 'wicket', 'wide', 'noball', 'milestone', 'goal', 'point']
const PARTICLES = 24

// Black-and-white 3D celebration on its own opaque layer: extruded word, floor grid, shockwave discs, tumbling shards and a ball.
export function SportCelebration({ event }) {
  const root = useRef(null)
  useEffect(() => {
    if (!event || event.seeded || !CELEBRATED.includes(event.kind) || reduced()) return
    const el = root.current
    const q = selector => el.querySelectorAll(selector)
    const kind = event.kind
    const burst = ['four', 'six', 'milestone', 'goal', 'point'].includes(kind)
    const context = gsap.context(() => {
      const word = q('.st-cel-word')
      const timeline = gsap.timeline({ onComplete: () => gsap.set(el, { autoAlpha: 0 }) })
      timeline.fromTo(el, { autoAlpha: 0 }, { autoAlpha: 1, duration: .2, ease: 'power1.out' }, 0)
      timeline.fromTo(q('.st-cel-floor'), { autoAlpha: 0, y: 60 }, { autoAlpha: 1, y: 0, duration: .6, ease: 'power3.out' }, 0)
      gsap.set(q('.st-cel-disc'), { rotationX: 74 })
      gsap.set(word, { rotationX: -100, rotationY: kind === 'six' ? -45 : 32, z: -600, scale: .6, autoAlpha: 1, transformOrigin: '50% 60%' })
      timeline.to(word, { rotationX: 0, rotationY: 0, z: 0, scale: 1, duration: .8, ease: 'back.out(1.6)' }, .15)
      timeline.to(word, { rotationY: 14, rotationX: -7, duration: .9, ease: 'sine.inOut', yoyo: true, repeat: 1 }, .95)
      timeline.fromTo(q('.st-cel-disc'), { scale: .1, autoAlpha: .9 }, { scale: kind === 'six' ? 6 : 4, autoAlpha: 0, duration: 1.2, stagger: .15, ease: 'power2.out' }, .15)
      if (kind === 'four') {
        timeline.fromTo(q('.st-cel-ball'), { x: '-48vw', y: 70, z: -350, scale: .5, rotation: 0, autoAlpha: 1 }, { x: '48vw', y: 90, z: 300, scale: 1.3, rotation: 900, duration: 1, ease: 'power2.in' }, 0)
        timeline.fromTo(q('.st-cel-streak'), { x: '-60vw', y: 96, autoAlpha: .9, scaleX: .2 }, { x: '40vw', scaleX: 1.2, autoAlpha: 0, duration: 1, ease: 'power2.in' }, .05)
      }
      if (kind === 'six') {
        timeline.fromTo(q('.st-cel-ball'), { x: '-12vw', y: 100, z: -250, scale: .4, rotation: 0, autoAlpha: 1 }, { x: '18vw', y: -260, z: 450, scale: 1.8, rotation: 600, autoAlpha: 0, duration: 1.15, ease: 'power2.out' }, .05)
      }
      if (kind === 'wicket') {
        timeline.fromTo(q('.st-cel-ball'), { x: '46vw', y: 80, z: -200, scale: .6, autoAlpha: 1 }, { x: '2vw', y: 80, z: 60, scale: 1, rotation: -700, duration: .45, ease: 'power2.in' }, 0)
        timeline.fromTo(q('.st-cel-stumps'), { x: 0 }, { x: 8, duration: .06, repeat: 7, yoyo: true, ease: 'none' }, .45)
        timeline.fromTo(q('.st-cel-stump'), { rotationX: 0, rotationZ: 0, y: 0, autoAlpha: 1, transformOrigin: '50% 100%' }, { rotationX: i => [-70, 40, -50][i], rotationZ: i => [-40, 8, 46][i], y: 30, x: i => [-34, 6, 40][i], autoAlpha: 0, duration: .9, ease: 'power2.in', stagger: .05 }, .45)
        timeline.fromTo(q('.st-cel-bail'), { y: 0, rotation: 0, autoAlpha: 1 }, { y: -90, x: i => (i ? 70 : -70), rotation: i => (i ? 520 : -520), autoAlpha: 0, duration: .9, ease: 'power2.out' }, .45)
      }
      if (kind === 'wide' || kind === 'noball') {
        timeline.fromTo(q('.st-cel-streak'), { x: '50vw', y: 40, autoAlpha: .9, scaleX: 1 }, { x: '-70vw', autoAlpha: 0, duration: .9, ease: 'power2.inOut' }, .1)
      }
      if (burst) {
        timeline.fromTo(q('.st-cel-dot'), { x: 0, y: 0, z: 0, scale: 1, autoAlpha: 1 }, {
          x: () => gsap.utils.random(-300, 300), y: () => gsap.utils.random(kind === 'six' ? -240 : -160, 60), z: () => gsap.utils.random(-200, 320), scale: () => gsap.utils.random(.5, 1.8),
          rotationX: () => gsap.utils.random(-540, 540), rotationY: () => gsap.utils.random(-540, 540), autoAlpha: 0,
          duration: () => gsap.utils.random(1, 1.6), ease: 'power2.out', stagger: { each: .01, from: 'center' },
        }, .2)
      }
      timeline.to(word, { rotationX: 85, y: -40, autoAlpha: 0, duration: .4, ease: 'power2.in' }, 1.85)
      timeline.to(el, { autoAlpha: 0, duration: .3, ease: 'power1.in' }, 2.1)
    }, root)
    return () => context.revert()
  }, [event])
  const kind = event?.kind ?? 'four'
  return <div ref={root} className="st-celebrate" data-kind={kind} aria-hidden="true">
    <div className="st-cel-floor" />
    <div className="st-cel-stage">
      {[0, 1, 2].map(i => <span className="st-cel-disc" key={i} />)}
      {Array.from({ length: PARTICLES }, (_, i) => <span className="st-cel-dot" key={i} style={{ '--h': (i * 47) % 360 }} />)}
      <span className="st-cel-streak" /><span className="st-cel-ball" />
      {kind === 'wicket' && <svg className="st-cel-stumps" viewBox="0 0 80 70"><rect className="st-cel-bail" x="14" y="12" width="24" height="4" rx="2" /><rect className="st-cel-bail" x="42" y="12" width="24" height="4" rx="2" />{[18, 38, 58].map(x => <rect className="st-cel-stump" key={x} x={x} y="18" width="5" height="46" rx="2.5" />)}</svg>}
      <b className="st-cel-word">{event?.word ?? ''}</b>
      {event?.team && <span className="st-cel-sub">{event.team}</span>}
    </div>
  </div>
}
