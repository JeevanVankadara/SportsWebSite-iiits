import { useEffect, useLayoutEffect, useRef } from 'react'
import gsap from 'gsap'

const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

// Segmented toggle whose thumb glides to the selected option with an eased spring.
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

const PARTICLES = 26
// Full-hero celebration for boundaries, sixes, wickets, extras and milestones. Reads a feed event; hidden between events.
export function BallCelebration({ event }) {
  const root = useRef(null)
  useEffect(() => {
    if (!event || event.seeded || !['four', 'six', 'wicket', 'wide', 'noball', 'milestone'].includes(event.kind) || reduced()) return
    const el = root.current
    const q = selector => el.querySelectorAll(selector)
    const kind = event.kind
    const context = gsap.context(() => {
      const timeline = gsap.timeline({ onComplete: () => gsap.set(el, { autoAlpha: 0 }) })
      gsap.set(el, { autoAlpha: 1 })
      gsap.set(q('.st-cel-word'), { scale: 0, rotation: kind === 'six' ? -14 : 0, x: 0, autoAlpha: 1 })
      timeline.fromTo(q('.st-cel-flash'), { autoAlpha: 0 }, { autoAlpha: kind === 'wicket' ? .55 : .4, duration: .12, yoyo: true, repeat: 1 }, 0)
      timeline.fromTo(q('.st-cel-ring'), { scale: .1, autoAlpha: .9 }, { scale: kind === 'six' ? 4.2 : 3, autoAlpha: 0, duration: 1, stagger: .12, ease: 'power2.out' }, 0)
      if (kind === 'four') timeline.fromTo(q('.st-cel-ball'), { x: '-60%', y: 30, autoAlpha: 1, rotation: 0 }, { x: '170%', y: 30, rotation: 900, duration: .8, ease: 'power2.in' }, 0).fromTo(q('.st-cel-rope'), { scaleX: 0, autoAlpha: 1 }, { scaleX: 1, duration: .5, ease: 'power3.out', transformOrigin: 'left' }, .1)
      timeline.to(q('.st-cel-word'), { scale: 1, rotation: 0, duration: .6, ease: kind === 'wicket' ? 'back.out(3)' : 'elastic.out(1.1, .5)' }, .05)
      if (kind === 'wicket') {
        timeline.fromTo(q('.st-cel-word'), { x: -14 }, { x: 0, duration: .5, ease: 'elastic.out(1.6, .12)' }, .3)
        timeline.fromTo(q('.st-cel-stump'), { rotation: 0, y: 0, autoAlpha: 1 }, { rotation: i => [-38, 10, 44][i % 3], y: 60, x: i => [-30, 4, 34][i % 3], autoAlpha: 0, duration: .9, ease: 'power2.in', stagger: .05 }, .12)
        timeline.fromTo(q('.st-cel-bail'), { y: 0, rotation: 0, autoAlpha: 1 }, { y: -80, x: i => (i ? 60 : -60), rotation: i => (i ? 480 : -480), autoAlpha: 0, duration: .9, ease: 'power2.out' }, .1)
      }
      if (kind === 'six' || kind === 'milestone' || kind === 'four') {
        timeline.fromTo(q('.st-cel-dot'), { x: 0, y: 0, scale: 1, autoAlpha: 1 }, {
          x: () => gsap.utils.random(-260, 260), y: () => gsap.utils.random(kind === 'six' ? -220 : -120, 40), scale: () => gsap.utils.random(.4, 1.6), autoAlpha: 0, rotation: () => gsap.utils.random(-320, 320),
          duration: () => gsap.utils.random(.9, 1.5), ease: 'power2.out', stagger: { each: .008, from: 'center' },
        }, .05)
      }
      timeline.to(q('.st-cel-word'), { autoAlpha: 0, y: -24, duration: .4, ease: 'power2.in' }, 1.35)
    }, root)
    return () => context.revert()
  }, [event])
  const kind = event?.kind ?? 'four'
  return <div ref={root} className="st-celebrate" data-kind={kind} aria-hidden="true">
    <div className="st-cel-flash" />
    <div className="st-cel-stage">
      {[0, 1, 2].map(i => <span className="st-cel-ring" key={i} />)}
      {Array.from({ length: PARTICLES }, (_, i) => <span className="st-cel-dot" key={i} style={{ '--h': (i * 47) % 360 }} />)}
      <span className="st-cel-ball" /><span className="st-cel-rope" />
      {kind === 'wicket' && <svg className="st-cel-stumps" viewBox="0 0 80 70"><rect className="st-cel-bail" x="14" y="12" width="24" height="4" rx="2" /><rect className="st-cel-bail" x="42" y="12" width="24" height="4" rx="2" />{[18, 38, 58].map(x => <rect className="st-cel-stump" key={x} x={x} y="18" width="5" height="46" rx="2.5" />)}</svg>}
      <b className="st-cel-word">{event?.word ?? ''}</b>
    </div>
  </div>
}
