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
const PARTICLES = 26

// The ball is drawn for the sport: a leather cricket ball with a spinning seam, a football, or a shuttlecock.
function BallFace({ sport }) {
  if (sport === 'football') return <svg className="st-ball3d" viewBox="0 0 44 44" aria-hidden="true"><defs><radialGradient id="cel-fb" cx=".35" cy=".3" r=".85"><stop offset="0" stopColor="#fff" /><stop offset=".7" stopColor="#dedede" /><stop offset="1" stopColor="#8b8b8b" /></radialGradient></defs><circle cx="22" cy="22" r="21" fill="url(#cel-fb)" stroke="#111" strokeWidth="1" /><path d="m22 13 7 5-2.7 8.3h-8.6L15 18Z" fill="#111" /><path d="M22 13V3M29 18l9-3M26.3 26.3l6 7M17.7 26.3l-6 7M15 18l-9-3" stroke="#111" strokeWidth="1.6" fill="none" /></svg>
  if (sport === 'badminton') return <svg className="st-ball3d" viewBox="0 0 44 44" aria-hidden="true"><path d="M13 6h18l5 22H8Z" fill="#f4f4f4" stroke="#111" strokeWidth="1" /><path d="M18 6 15 28M22 6v22M26 6l3 22M10 17h24" stroke="#9aa0aa" strokeWidth="1.2" fill="none" /><circle cx="22" cy="34" r="8" fill="#e8e8e8" stroke="#111" strokeWidth="1" /><ellipse cx="19" cy="31" rx="2.6" ry="4" fill="#fff" opacity=".85" /></svg>
  return <span className="st-ball3d st-ball-cricket"><i className="seam s1" /><i className="seam s2" /><i className="shine" /></span>
}

// Creative 3D celebration on its own opaque black layer. Cricket: boundary rope, ball flying at the camera, stumps flying apart.
export function SportCelebration({ event, sport = 'cricket' }) {
  const root = useRef(null)
  useEffect(() => {
    if (!event || event.seeded || !CELEBRATED.includes(event.kind) || reduced()) return
    const el = root.current
    const q = selector => el.querySelectorAll(selector)
    const kind = event.kind
    const W = el.clientWidth
    const H = el.clientHeight
    const context = gsap.context(() => {
      const stage = q('.st-cel-stage')
      const word = q('.st-cel-word')
      const ball = q('.st-cel-ball')
      const tl = gsap.timeline({ onComplete: () => gsap.set(el, { autoAlpha: 0 }) })
      const shake = (amp, at) => tl.fromTo(stage, { x: 0, y: 0 }, { x: () => gsap.utils.random(-amp, amp), y: () => gsap.utils.random(-amp, amp), duration: .05, repeat: 9, yoyo: true, ease: 'none' }, at).set(stage, { x: 0, y: 0 }, at + .52)
      const slam = at => {
        gsap.set(word, { rotationX: -100, rotationY: kind === 'six' ? -40 : 28, z: -900, scale: .5, autoAlpha: 1, transformOrigin: '50% 60%' })
        tl.to(word, { rotationX: 0, rotationY: 0, z: 0, scale: 1, duration: .7, ease: 'expo.out' }, at)
        tl.to(word, { rotationY: 12, rotationX: -6, duration: .9, ease: 'sine.inOut', yoyo: true, repeat: 1 }, at + .7)
      }
      const shards = at => tl.fromTo(q('.st-cel-dot'), { x: 0, y: 0, z: 0, scale: 1, autoAlpha: 1 }, {
        x: () => gsap.utils.random(-W * .5, W * .5), y: () => gsap.utils.random(-H * .55, H * .3), z: () => gsap.utils.random(-200, 340), scale: () => gsap.utils.random(.5, 1.8),
        rotationX: () => gsap.utils.random(-540, 540), rotationY: () => gsap.utils.random(-540, 540), autoAlpha: 0,
        duration: () => gsap.utils.random(1, 1.6), ease: 'power2.out', stagger: { each: .01, from: 'center' },
      }, at)
      const rings = (at, size) => tl.fromTo(q('.st-cel-disc'), { scale: .1, autoAlpha: .9 }, { scale: size, autoAlpha: 0, duration: 1.2, stagger: .15, ease: 'power2.out' }, at)

      tl.fromTo(el, { autoAlpha: 0 }, { autoAlpha: 1, duration: .2, ease: 'power1.out' }, 0)
      tl.fromTo(q('.st-cel-floor'), { autoAlpha: 0, y: 60 }, { autoAlpha: 1, y: 0, duration: .6, ease: 'power3.out' }, 0)
      gsap.set(q('.st-cel-disc'), { rotationX: 74 })
      gsap.set(ball, { autoAlpha: 0 })

      if (kind === 'four') {
        // The ball skims across the turf toward the camera and crosses the boundary rope.
        tl.fromTo(q('.st-cel-rope3d'), { autoAlpha: 0 }, { autoAlpha: 1, duration: .4 }, 0)
        gsap.set(ball, { autoAlpha: 1, scale: .35, x: -W * .42, y: H * .16, rotation: 0 })
        tl.to(ball, { x: W * .38, y: H * .3, scale: 1.7, rotation: 320, duration: 1, ease: 'power2.in' }, .05)
        tl.to(ball, { autoAlpha: 0, duration: .12 }, 1.02)
        tl.fromTo(q('.st-cel-streak'), { x: -W * .6, y: H * .3, autoAlpha: .9, scaleX: .2 }, { x: W * .3, scaleX: 1.2, autoAlpha: 0, duration: 1, ease: 'power2.in' }, .08)
        tl.to(q('.st-cel-rope3d'), { scale: 1.05, borderColor: '#fff', boxShadow: '0 0 46px #fff, inset 0 0 30px rgba(255,255,255,.5)', duration: .16, yoyo: true, repeat: 1 }, .98)
        rings(1, 4); shards(1); shake(7, 1); slam(1)
      } else if (kind === 'six') {
        // The ball launches at the camera under stadium floodlights and bursts.
        tl.fromTo(q('.st-cel-beam'), { autoAlpha: 0, rotation: i => (i ? 30 : -30) }, { autoAlpha: .55, rotation: i => (i ? 9 : -9), duration: .9, ease: 'power2.out' }, 0)
        gsap.set(ball, { autoAlpha: 1, scale: .3, x: -W * .1, y: H * .3, rotation: 0 })
        tl.to(ball, { x: W * .1, y: -H * .04, scale: 3.4, rotation: 540, duration: 1, ease: 'power2.in' }, .05)
        tl.to(ball, { autoAlpha: 0, duration: .08 }, 1.05)
        tl.fromTo(q('.st-cel-flash'), { autoAlpha: 0 }, { autoAlpha: .95, duration: .08, yoyo: true, repeat: 1 }, 1.05)
        rings(1.05, 6); shards(1.05); shake(11, 1.05); slam(1.05)
      } else if (kind === 'wicket') {
        // The ball smashes the stumps; stumps and bails fly at the camera.
        gsap.set(ball, { autoAlpha: 1, scale: .5, x: W * .4, y: H * .2, rotation: 0 })
        tl.to(ball, { x: 0, y: H * .12, scale: 1.1, rotation: -720, duration: .5, ease: 'power3.in' }, .05)
        tl.fromTo(q('.st-cel-flash'), { autoAlpha: 0 }, { autoAlpha: .7, duration: .07, yoyo: true, repeat: 1 }, .55)
        tl.to(ball, { x: W * .16, y: -H * .1, scale: 3, autoAlpha: 0, rotation: -1080, duration: .6, ease: 'power2.out' }, .55)
        tl.fromTo(q('.st-cel-stump'), { rotationX: 0, rotationZ: 0, y: 0, scale: 1, autoAlpha: 1, transformOrigin: '50% 100%' }, { rotationX: i => [-70, 40, -50][i], rotationZ: i => [-40, 8, 46][i], y: -H * .1, x: i => [-70, 10, 80][i], scale: 2.2, autoAlpha: 0, duration: .9, ease: 'power2.in', stagger: .05 }, .55)
        tl.fromTo(q('.st-cel-bail'), { y: 0, rotation: 0, scale: 1, autoAlpha: 1 }, { y: -H * .45, x: i => (i ? 110 : -110), rotation: i => (i ? 520 : -520), scale: 2.4, autoAlpha: 0, duration: .9, ease: 'power2.out' }, .55)
        rings(.55, 4); shake(10, .55); slam(.55)
      } else if (kind === 'wide' || kind === 'noball') {
        gsap.set(ball, { autoAlpha: 1, scale: .6, x: W * .5, y: -H * .12, rotation: 0 })
        tl.to(ball, { x: -W * .5, scale: 1.2, rotation: -900, duration: 1, ease: 'power2.inOut' }, .1)
        tl.fromTo(q('.st-cel-streak'), { x: W * .5, y: -H * .12, autoAlpha: .9, scaleX: 1 }, { x: -W * .7, autoAlpha: 0, duration: 1, ease: 'power2.inOut' }, .1)
        rings(.3, 3); slam(.3)
      } else {
        // Milestones, goals and smashes: floodlights, shockwaves, shards and the sport's ball flying at the camera.
        tl.fromTo(q('.st-cel-beam'), { autoAlpha: 0, rotation: i => (i ? 30 : -30) }, { autoAlpha: .5, rotation: i => (i ? 9 : -9), duration: .9, ease: 'power2.out' }, 0)
        if (kind === 'goal' || kind === 'point') {
          gsap.set(ball, { autoAlpha: 1, scale: .35, x: -W * .35, y: H * .3, rotation: 0 })
          tl.to(ball, { x: W * .05, y: -H * .02, scale: 3, rotation: 720, duration: .9, ease: 'power2.in' }, .05)
          tl.to(ball, { autoAlpha: 0, duration: .08 }, .95)
        }
        const at = kind === 'milestone' ? .15 : .95
        rings(at, 5); shards(at); slam(at)
        if (kind !== 'milestone') shake(8, at)
      }
      tl.to(word, { rotationX: 85, y: -40, autoAlpha: 0, duration: .4, ease: 'power2.in' }, 2.15)
      tl.to(el, { autoAlpha: 0, duration: .3, ease: 'power1.in' }, 2.4)
    }, root)
    return () => context.revert()
  }, [event, sport])
  const kind = event?.kind ?? 'four'
  return <div ref={root} className="st-celebrate" data-kind={kind} aria-hidden="true">
    <div className="st-cel-floor" />
    <span className="st-cel-rope3d" />
    <span className="st-cel-beam left" /><span className="st-cel-beam right" />
    <div className="st-cel-stage">
      {[0, 1, 2].map(i => <span className="st-cel-disc" key={i} />)}
      {Array.from({ length: PARTICLES }, (_, i) => <span className="st-cel-dot" key={i} style={{ '--h': (i * 47) % 360 }} />)}
      <span className="st-cel-streak" />
      <span className="st-cel-ball"><BallFace sport={sport} /></span>
      {kind === 'wicket' && <svg className="st-cel-stumps" viewBox="0 0 80 70"><rect className="st-cel-bail" x="14" y="12" width="24" height="4" rx="2" /><rect className="st-cel-bail" x="42" y="12" width="24" height="4" rx="2" />{[18, 38, 58].map(x => <rect className="st-cel-stump" key={x} x={x} y="18" width="5" height="46" rx="2.5" />)}</svg>}
      <b className="st-cel-word">{event?.word ?? ''}</b>
      {event?.team && <span className="st-cel-sub">{event.team}</span>}
    </div>
    <div className="st-cel-flash" />
  </div>
}
