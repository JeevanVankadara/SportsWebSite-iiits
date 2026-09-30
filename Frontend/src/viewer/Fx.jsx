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
const SCENE = { four: 'four', six: 'six', wicket: 'wicket', wide: 'wide', noball: 'wide', milestone: 'milestone', goal: 'goal', point: 'point' }
const FLOOR = 172

// Flat vector props. Everything is drawn in a 400x200 frame and scaled to fit the card, so nothing is cropped.
function Ball({ sport }) {
  if (sport === 'football') return <g className="c-ball"><g className="c-spin"><g transform="scale(1.5)"><circle r="11" fill="url(#c-shade)" className="cs-ring" /><path d="m0-5 5 3.6-1.9 5.8h-6.2L-5-1.4Z" className="cs-fill" /><path d="M0-5v-6M5-1.4l6-2M3.1 4.4l4 5M-3.1 4.4l-4 5M-5-1.4l-6-2" className="cs-line" /></g></g></g>
  if (sport === 'badminton') return <g className="c-ball"><g className="c-spin"><g transform="scale(1.5)"><path d="M-6-13h12l3 13h-18Z" fill="#fff" className="cs-ring" /><path d="M-3-13-4-1M0-13v12M3-13l1 12" className="cs-line" /><circle cy="4" r="5" fill="url(#c-shade)" className="cs-ring" /></g></g></g>
  return <g className="c-ball"><g className="c-spin"><g transform="scale(1.5)"><circle r="9" fill="url(#c-shade)" className="cs-ring" /><path d="M-6-6.4q4 6.4 0 12.8M6-6.4q-4 6.4 0 12.8" className="cs-seam" /></g></g></g>
}
function Stumps({ faint }) {
  return <g className="c-stumps" opacity={faint ? .45 : 1}>
    {[289, 300, 311].map(x => <rect className="c-stump cs-ink" key={x} x={x - 2.5} y="112" width="5" height={FLOOR - 16.52} rx="2.5" />)}
    <rect className="c-bail cs-fill" x="289" y="107" width="10" height="4" rx="2" /><rect className="c-bail cs-fill" x="301" y="107" width="10" height="4" rx="2" />
  </g>
}
function Scene({ kind }) {
  return <svg className="st-cel-scene" viewBox="0 0 400 200" preserveAspectRatio="xMidYMax meet" aria-hidden="true">
    <defs><radialGradient id="c-shade" cx=".35" cy=".3" r=".85"><stop offset="0" stopColor="#fff" /><stop offset="1" stopColor="#c6ddff" /></radialGradient></defs>
    <line x1="-2000" y1={FLOOR} x2="2400" y2={FLOOR} className="cs-mute" strokeWidth="2" />
    {kind === 'four' && <>
      <g className="c-board"><rect x="352" y="138" width="90" height="34" rx="4" className="cs-soft" /><path d="M364 172l14-34M386 172l14-34M408 172l14-34" className="cs-mute" strokeWidth="7" /></g>
      <g className="c-rope"><path d="M320 172h18" className="cs-line" strokeWidth="3" strokeDasharray="4 4" /><path className="c-flag cs-fill" d="M329 172v-28l13 5-13 7" /></g>
      <ellipse className="c-shadow cs-soft" cx="0" cy={FLOOR + 1} rx="9" ry="2.4" />
    </>}
    {kind === 'six' && <>
      <g className="c-light"><circle className="c-glow cs-fill" cx="373" cy="54" r="14" opacity="0" /><path d="M373 172V62" className="cs-mute" strokeWidth="3" /><rect x="359" y="46" width="28" height="16" rx="3" className="cs-fill" /></g>
      <g className="c-crowd">{Array.from({ length: 12 }, (_, i) => <g className="c-fan" key={i}><circle cx={214 + i * 12} cy="156" r="4.4" className="cs-soft" /><rect x={210 + i * 12} y="160" width="8.4" height="12" rx="3" className="cs-soft" /></g>)}</g>
      <g transform="translate(80 110)"><g className="c-bat"><rect x="-3" y="0" width="6" height="22" rx="3" className="cs-ink" /><rect x="-7" y="20" width="14" height="34" rx="5" className="cs-fill" /></g></g>
      <g className="c-trail">{Array.from({ length: 7 }, (_, i) => <circle key={i} r={7 - i * .7} className="cs-soft" />)}</g>
    </>}
    {kind === 'wicket' && <Stumps />}
    {kind === 'wide' && <><Stumps faint /><path className="cs-mute" d="M420 96Q250 84-20 112" fill="none" strokeWidth="2" strokeDasharray="5 6" /></>}
    {kind === 'milestone' && <>
      <circle className="c-ring-bg cs-mute" cx="200" cy="112" r="44" fill="none" strokeWidth="5" />
      <circle className="c-ring cs-line" cx="200" cy="112" r="44" fill="none" strokeWidth="5" strokeLinecap="round" strokeDasharray="277" transform="rotate(-90 200 112)" />
      <g transform="translate(200 112) rotate(38)"><rect x="-3" y="-30" width="6" height="16" rx="3" className="cs-ink" /><rect x="-7" y="-16" width="14" height="40" rx="5" className="cs-fill" /></g>
      <g className="c-burst">{Array.from({ length: 14 }, (_, i) => <line key={i} x1="0" y1="-52" x2="0" y2="-62" className="cs-line" strokeWidth="3" strokeLinecap="round" transform={`translate(200 112) rotate(${i * (360 / 14)})`} />)}</g>
    </>}
    {kind === 'goal' && <>
      <g className="c-goal"><g className="c-net">{Array.from({ length: 9 }, (_, i) => <line key={`v${i}`} x1={300 + i * 11} y1="90" x2={300 + i * 11} y2={FLOOR} className="cs-mute" strokeWidth="1.2" />)}{Array.from({ length: 7 }, (_, i) => <line key={`h${i}`} x1="298" y1={100 + i * 12} x2="392" y2={100 + i * 12} className="cs-mute" strokeWidth="1.2" />)}</g><path d="M296 172V86h100v86" className="cs-line" strokeWidth="4" strokeLinejoin="round" fill="none" /></g>
    </>}
    {kind === 'point' && <>
      <g className="c-net2"><rect x="196" y="110" width="8" height="62" rx="2" className="cs-soft" /><path d="M200 112v60" className="cs-mute" strokeWidth="8" strokeDasharray="2 3" /><rect x="190" y="106" width="20" height="5" rx="2.5" className="cs-fill" /></g>
      <g transform="translate(58 128)"><g className="c-racket"><rect x="-2" y="0" width="4" height="34" rx="2" className="cs-ink" /><ellipse cx="0" cy="-14" rx="11" ry="15" className="cs-line" strokeWidth="3" fill="none" /><path d="M-9-14h18M0-27v26" className="cs-mute" strokeWidth="1" /></g></g>
      <g className="c-speed">{[0, 1, 2].map(i => <line key={i} x1="0" y1={i * 5} x2="-34" y2={i * 5 - 14} className="cs-line" strokeWidth="2" strokeLinecap="round" opacity="0" />)}</g>
    </>}
    <circle className="c-impact cs-line" r="12" fill="none" strokeWidth="3" opacity="0" />
    <g className="c-dust">{Array.from({ length: 6 }, (_, i) => <circle key={i} r="3" className="cs-soft" opacity="0" />)}</g>
    <Ball sport={kind === 'goal' ? 'football' : kind === 'point' ? 'badminton' : 'cricket'} />
    <g className="c-conf">{Array.from({ length: 22 }, (_, i) => <rect key={i} width="7" height="3.5" rx="1" className={['cs-fill', 'cs-white', 'cs-ink'][i % 3]} opacity="0" />)}</g>
  </svg>
}

const spinFor = distance => (distance / 13.5) * 57.3
function play(el, kind) {
  const q = s => el.querySelectorAll(s)
  const one = s => el.querySelector(s)
  const tl = gsap.timeline({ onComplete: () => gsap.set(el, { autoAlpha: 0 }) })
  const word = one('.st-cel-word')
  const ball = one('.c-ball')
  const spin = one('.c-spin')
  gsap.set(ball, { autoAlpha: 0, transformOrigin: '0px 13.5px', scale: 1 })
  gsap.set(q('.c-conf rect, .c-dust circle, .c-trail circle'), { autoAlpha: 0 })
  gsap.set(word, { autoAlpha: 0 })

  const confetti = (at, ox, oy, power = 1) => q('.c-conf rect').forEach(piece => {
    const d = gsap.utils.random(.9, 1.4)
    const rise = gsap.utils.random(50, 120) * power
    tl.set(piece, { x: ox, y: oy, rotation: 0, autoAlpha: 1 }, at)
    tl.to(piece, { x: ox + gsap.utils.random(-95, 95) * power, duration: d, ease: 'none' }, at)
    tl.to(piece, { y: oy - rise, duration: d * .42, ease: 'power2.out' }, at)
    tl.to(piece, { y: oy + 44, duration: d * .58, ease: 'power2.in' }, at + d * .42)
    tl.to(piece, { rotation: gsap.utils.random(-540, 540), duration: d, ease: 'none' }, at)
    tl.to(piece, { autoAlpha: 0, duration: .25 }, at + d - .25)
  })
  const dust = (at, x, y) => q('.c-dust circle').forEach((puff, i) => {
    tl.set(puff, { x, y, autoAlpha: .8, scale: 1 }, at)
    tl.to(puff, { x: x + (i - 2.5) * 9, y: y - gsap.utils.random(8, 22), scale: 2.2, autoAlpha: 0, duration: .55, ease: 'power2.out' }, at)
  })
  const impact = (at, x, y) => tl.fromTo(one('.c-impact'), { x, y, scale: .3, autoAlpha: 1 }, { scale: 2.6, autoAlpha: 0, duration: .45, ease: 'power2.out' }, at)
  const pop = (at, shake) => {
    tl.fromTo(word, { autoAlpha: 0, scale: .5, y: 26 }, { autoAlpha: 1, scale: 1, y: 0, duration: .55, ease: 'back.out(2.2)' }, at)
    if (shake) tl.fromTo(word, { x: -14 }, { x: 0, duration: .7, ease: 'elastic.out(1.5,.22)' }, at + .05)
  }
  const squashHop = (at, base, amp) => {
    tl.to(ball, { y: base - amp, duration: .13, ease: 'power2.out' }, at)
    tl.to(ball, { y: base, duration: .13, ease: 'power2.in' }, at + .13)
    tl.to(ball, { scaleX: 1.18, scaleY: .8, duration: .04, yoyo: true, repeat: 1 }, at + .25)
  }

  tl.fromTo(el, { autoAlpha: 0 }, { autoAlpha: 1, duration: .22, ease: 'power1.out' }, 0)

  if (kind === 'four') {
    const base = FLOOR - 13.5
    const shadow = one('.c-shadow')
    gsap.set(ball, { x: -18, y: base, autoAlpha: 1 })
    gsap.set(shadow, { x: -18, autoAlpha: .55 })
    tl.to(ball, { x: 338, duration: 1.15, ease: 'power2.out' }, .1)
    tl.to(shadow, { x: 338, duration: 1.15, ease: 'power2.out' }, .1)
    tl.to(spin, { rotation: spinFor(356), duration: 1.15, ease: 'power2.out' }, .1)
    ;[[.22, 20], [.5, 10], [.76, 4]].forEach(([t, a]) => squashHop(t, base, a))
    dust(.14, -8, FLOOR - 3)
    tl.to(one('.c-rope'), { scaleY: 1.5, transformOrigin: '50% 100%', duration: .1, yoyo: true, repeat: 3, ease: 'sine.inOut' }, .98)
    tl.to(one('.c-flag'), { rotation: 14, transformOrigin: '0% 100%', duration: .12, yoyo: true, repeat: 5, ease: 'sine.inOut' }, .98)
    tl.to(one('.c-board'), { x: 3, duration: .05, yoyo: true, repeat: 3 }, 1.2)
    dust(1.05, 332, FLOOR - 3)
    pop(1.02); confetti(1.08, 338, 130, 1)
  } else if (kind === 'six') {
    const bat = one('.c-bat')
    gsap.set(bat, { rotation: 78, transformOrigin: '0px 0px' })
    gsap.set(ball, { x: 114, y: 150 })
    tl.to(bat, { rotation: -78, duration: .3, ease: 'power3.in' }, .04)
    tl.set(ball, { autoAlpha: 1 }, .25)
    impact(.25, 114, 150)
    const launch = (target, delay) => {
      tl.to(target, { x: 470, duration: 1.3, ease: 'none' }, .26 + delay)
      tl.to(target, { y: 8, duration: .6, ease: 'power2.out' }, .26 + delay)
      tl.to(target, { y: 72, duration: .7, ease: 'power2.in' }, .86 + delay)
    }
    launch(ball, 0)
    tl.to(spin, { rotation: -1500, duration: 1.3, ease: 'none' }, .26)
    q('.c-trail circle').forEach((dot, i) => {
      gsap.set(dot, { x: 114, y: 150 })
      tl.set(dot, { autoAlpha: .55 - i * .07 }, .26 + (i + 1) * .045)
      launch(dot, (i + 1) * .045)
      tl.to(dot, { autoAlpha: 0, duration: .2 }, 1.2 + (i + 1) * .045)
    })
    tl.to(q('.c-fan'), { y: -9, duration: .16, yoyo: true, repeat: 3, ease: 'sine.inOut', stagger: .04 }, .95)
    tl.fromTo(one('.c-glow'), { autoAlpha: .7, scale: 1, transformOrigin: '50% 50%' }, { autoAlpha: 0, scale: 3, duration: .8, ease: 'power2.out' }, .95)
    pop(.95); confetti(1.0, 330, 118, 1.25)
  } else if (kind === 'wicket') {
    gsap.set(ball, { x: -18, y: 96, autoAlpha: 1 })
    gsap.set(q('.c-stump'), { transformOrigin: '50% 100%' })
    tl.to(ball, { x: 296, duration: .85, ease: 'none' }, .1)
    tl.to(ball, { y: FLOOR - 13.5, duration: .5, ease: 'power2.in' }, .1)
    tl.to(ball, { y: 138, duration: .35, ease: 'power2.out' }, .6)
    tl.to(ball, { scaleX: 1.18, scaleY: .8, duration: .04, yoyo: true, repeat: 1 }, .58)
    tl.to(spin, { rotation: 1500, duration: .85, ease: 'none' }, .1)
    dust(.58, 232, FLOOR - 3)
    impact(.95, 296, 138)
    const stumps = q('.c-stump')
    tl.to(stumps[0], { rotation: -24, x: -14, duration: .5, ease: 'power2.out' }, .95)
    tl.to(stumps[1], { rotation: 64, x: 52, y: -6, duration: .55, ease: 'power2.out' }, .95)
    tl.to(stumps[2], { rotation: 30, x: 24, duration: .5, ease: 'power2.out' }, .95)
    q('.c-bail').forEach((bail, i) => {
      tl.to(bail, { x: i ? 60 : -26, duration: .75, ease: 'none' }, .95)
      tl.to(bail, { y: -58, duration: .3, ease: 'power2.out' }, .95)
      tl.to(bail, { y: FLOOR - 16.52, duration: .45, ease: 'power2.in' }, 1.25)
      tl.to(bail, { rotation: i ? 540 : -540, duration: .75, ease: 'none' }, .95)
    })
    tl.to(ball, { x: 350, duration: .7, ease: 'power1.out' }, .95)
    tl.to(ball, { y: 96, duration: .25, ease: 'power2.out' }, .95).to(ball, { y: FLOOR - 13.5, duration: .45, ease: 'bounce.out' }, 1.2)
    pop(.98, true)
  } else if (kind === 'wide') {
    gsap.set(ball, { x: 430, y: 96, autoAlpha: 1 })
    tl.to(ball, { x: -30, duration: 1.1, ease: 'power1.inOut' }, .15)
    tl.to(ball, { y: 112, duration: 1.1, ease: 'sine.inOut' }, .15)
    tl.to(spin, { rotation: -1300, duration: 1.1, ease: 'none' }, .15)
    pop(.4)
  } else if (kind === 'milestone') {
    tl.fromTo(one('.c-ring'), { strokeDashoffset: 277 }, { strokeDashoffset: 0, duration: .9, ease: 'power2.inOut' }, .1)
    tl.fromTo(q('.c-burst line'), { scale: .4, autoAlpha: 0, transformOrigin: '0px 0px' }, { scale: 1.3, autoAlpha: 1, duration: .25, ease: 'power2.out', stagger: .01 }, .95)
    tl.to(q('.c-burst line'), { autoAlpha: 0, duration: .35 }, 1.25)
    pop(.85); confetti(.95, 200, 100, 1.3)
  } else if (kind === 'goal') {
    const base = FLOOR - 16.5
    gsap.set(ball, { x: 30, y: base, autoAlpha: 1, transformOrigin: '0px 16.5px' })
    tl.to(ball, { x: 344, duration: 1, ease: 'none' }, .15)
    tl.to(ball, { y: 58, duration: .5, ease: 'power2.out' }, .15)
    tl.to(ball, { y: 124, duration: .5, ease: 'power2.in' }, .65)
    tl.to(spin, { rotation: 900, duration: 1, ease: 'none' }, .15)
    tl.to(one('.c-net'), { scaleX: 1.08, skewY: 4, transformOrigin: '100% 50%', duration: .09, yoyo: true, repeat: 5, ease: 'sine.inOut' }, 1.12)
    tl.to(ball, { x: 360, duration: .3, ease: 'power2.out' }, 1.15)
    tl.to(ball, { y: base, duration: .5, ease: 'bounce.out' }, 1.15)
    impact(1.12, 344, 124)
    pop(1.1); confetti(1.15, 345, 110, 1.1)
  } else if (kind === 'point') {
    const racket = one('.c-racket')
    gsap.set(racket, { rotation: -55, transformOrigin: '0px 0px' })
    gsap.set(ball, { x: 66, y: 114, rotation: 0 })
    tl.to(racket, { rotation: 55, duration: .28, ease: 'power3.in' }, .08)
    tl.set(ball, { autoAlpha: 1 }, .22)
    tl.to(ball, { x: 332, duration: .95, ease: 'none' }, .24)
    tl.to(ball, { y: 34, duration: .38, ease: 'power2.out' }, .24)
    tl.to(ball, { y: FLOOR - 4, duration: .57, ease: 'power3.in' }, .62)
    tl.fromTo(ball, { rotation: -20 }, { rotation: 110, duration: .95, ease: 'sine.inOut' }, .24)
    tl.fromTo(q('.c-speed line'), { x: 200, y: 40, autoAlpha: .8 }, { x: 330, y: 150, autoAlpha: 0, duration: .5, ease: 'power2.in', stagger: .05 }, .62)
    impact(1.16, 332, FLOOR - 4); dust(1.16, 332, FLOOR - 3)
    pop(1.1); confetti(1.16, 332, 130, 1)
  }
  tl.to(word, { autoAlpha: 0, y: -14, scale: .94, duration: .3, ease: 'power2.in' }, 2.15)
  tl.to(el, { autoAlpha: 0, duration: .3, ease: 'power1.in' }, 2.4)
  return tl
}

// A 2D celebration inside the card frame. Colours follow the theme: black and blue (dark) or white and blue (light).
export function SportCelebration({ event, sport = 'cricket' }) {
  const root = useRef(null)
  useEffect(() => {
    if (!event || event.seeded || !CELEBRATED.includes(event.kind) || reduced()) return
    const el = root.current
    const context = gsap.context(() => play(el, SCENE[event.kind]), root)
    return () => context.revert()
  }, [event, sport])
  const kind = event?.kind ?? 'four'
  return <div ref={root} className="st-celebrate" data-kind={kind} aria-hidden="true">
    <Scene kind={SCENE[kind]} />
    <b className="st-cel-word">{event?.word ?? ''}</b>
    {event?.team && <span className="st-cel-sub">{event.team}</span>}
  </div>
}
