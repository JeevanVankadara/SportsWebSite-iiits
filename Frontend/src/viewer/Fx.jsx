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
const SCENE = { four: 'hit', six: 'hit', milestone: 'raise', wicket: 'stumps', wide: 'pass', noball: 'pass', goal: 'goal', point: 'smash' }

function Ball({ className = 'sc-ball', r = 10 }) {
  return <g className={className}><circle r={r} fill="#e5352b" /><circle r={r} fill="url(#sc-shine)" /><path d={`M${-r} -2q${r} ${r * .9} ${r * 2} 0`} fill="none" stroke="#fff" strokeOpacity=".85" strokeWidth="1.4" strokeDasharray="2 2" /></g>
}
function Bat() {
  return <g transform="translate(150 46)"><g className="sc-bat-pos"><g className="sc-bat-rot">
    <rect x="-4" y="0" width="8" height="42" rx="4" fill="#2c2c2e" />
    <rect x="-12" y="38" width="24" height="76" rx="9" fill="#e8b36a" /><rect x="-12" y="38" width="24" height="76" rx="9" fill="url(#sc-wood)" />
    <rect x="-5" y="48" width="4" height="54" rx="2" fill="#fff" opacity=".4" />
  </g></g></g>
}
function Stumps() {
  return <g className="sc-stumps">
    <line x1="150" y1="196" x2="370" y2="196" stroke="#fff" strokeOpacity=".35" strokeWidth="2" />
    {[236, 250, 264].map(x => <rect className="sc-stump" key={x} x={x - 3} y="118" width="6" height="78" rx="3" fill="#f5e6c8" />)}
    <rect className="sc-bail" x="234" y="112" width="14" height="5" rx="2.5" fill="#ffd60a" /><rect className="sc-bail" x="252" y="112" width="14" height="5" rx="2.5" fill="#ffd60a" />
  </g>
}
function Scene({ kind }) {
  return <svg className="st-cel-scene" viewBox="0 0 400 220" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
    <defs>
      <radialGradient id="sc-shine" cx=".35" cy=".3" r=".8"><stop offset="0" stopColor="#fff" stopOpacity=".7" /><stop offset="1" stopColor="#fff" stopOpacity="0" /></radialGradient>
      <linearGradient id="sc-wood" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#fbd99a" /><stop offset="1" stopColor="#c47a24" /></linearGradient>
    </defs>
    {(kind === 'hit' || kind === 'raise') && <><line className="sc-ground" x1="0" y1="196" x2="400" y2="196" stroke="#fff" strokeOpacity=".4" strokeWidth="2" /><Bat />{kind === 'hit' && <Ball />}</>}
    {kind === 'stumps' && <><Stumps /><Ball /></>}
    {kind === 'pass' && <><Stumps /><Ball /></>}
    {kind === 'goal' && <>
      <g className="sc-net"><path d="M285 190V56h105v134" fill="rgba(255,255,255,.08)" stroke="#fff" strokeWidth="5" strokeLinejoin="round" />{Array.from({ length: 7 }, (_, i) => <line key={i} x1={300 + i * 14} y1="60" x2={300 + i * 14} y2="190" stroke="#fff" strokeOpacity=".4" />)}{Array.from({ length: 6 }, (_, i) => <line key={i} x1="288" y1={78 + i * 22} x2="388" y2={78 + i * 22} stroke="#fff" strokeOpacity=".4" />)}</g>
      <line x1="0" y1="196" x2="400" y2="196" stroke="#fff" strokeOpacity=".4" strokeWidth="2" />
      <g className="sc-football"><circle r="14" fill="#fff" /><path d="m0-7 6.6 4.8-2.5 7.7h-8.2l-2.5-7.7Z" fill="#23252c" /><circle r="14" fill="url(#sc-shine)" /></g>
    </>}
    {kind === 'smash' && <>
      <line x1="0" y1="196" x2="400" y2="196" stroke="#fff" strokeOpacity=".4" strokeWidth="2" />
      <rect x="198" y="96" width="5" height="100" rx="2.5" fill="#fff" /><path d="M203 100h2v50h-2z" fill="none" /><g stroke="#fff" strokeOpacity=".45">{Array.from({ length: 6 }, (_, i) => <line key={i} x1="150" y1={102 + i * 8} x2="250" y2={102 + i * 8} />)}</g>
      <g transform="translate(74 150)"><g className="sc-racket"><rect x="-2.5" y="0" width="5" height="46" rx="2.5" fill="#2c2c2e" /><ellipse cx="0" cy="-22" rx="17" ry="24" fill="none" stroke="#fff" strokeWidth="4" /><g stroke="#fff" strokeOpacity=".5"><line x1="-12" y1="-22" x2="12" y2="-22" /><line x1="0" y1="-44" x2="0" y2="0" /></g></g></g>
      <g className="sc-shuttle"><circle r="6" fill="#ffd60a" /><path d="M-3 0-9-16h18L3 0Z" fill="#fff" transform="rotate(180)" /><path d="M-9-16 9-16" stroke="#cfd4dc" strokeWidth="2" transform="rotate(180)" /></g>
    </>}
    <circle className="sc-impact" r="24" fill="none" stroke="#fff" strokeWidth="4" opacity="0" />
    <g className="sc-dust">{[0, 1, 2, 3, 4, 5].map(i => <circle key={i} r="4" fill="#fff" opacity="0" />)}</g>
  </svg>
}

function play(kind, el, q) {
  const tl = gsap.timeline({ onComplete: () => gsap.set(el, { autoAlpha: 0 }) })
  const word = q('.st-cel-word')
  const ball = q('.sc-ball')
  tl.fromTo(el, { autoAlpha: 0 }, { autoAlpha: 1, duration: .22, ease: 'power1.out' }, 0)
  gsap.set(word, { scale: 0, autoAlpha: 1, y: 0 })
  gsap.set(q('.sc-dust circle'), { x: 0, y: 0, autoAlpha: 0 })
  const impactAt = (x, y, t) => tl.fromTo(q('.sc-impact'), { x, y, scale: .2, autoAlpha: 1 }, { scale: 2.6, autoAlpha: 0, duration: .5, ease: 'power2.out' }, t)
    .fromTo(q('.sc-dust circle'), { x, y, autoAlpha: 1, scale: 1 }, { x: () => x + gsap.utils.random(-70, 70), y: () => y + gsap.utils.random(-70, 20), scale: 0, autoAlpha: 0, duration: .7, ease: 'power2.out', stagger: .015 }, t)
  const popWord = t => tl.to(word, { scale: 1, duration: .5, ease: 'back.out(2.4)' }, t)

  if (kind === 'hit' || kind === 'raise') {
    const rot = q('.sc-bat-rot')
    gsap.set(rot, { rotation: 78, svgOrigin: '0 0' })
    if (kind === 'raise') {
      gsap.set(q('.sc-bat-pos'), { y: 78 })
      tl.to(rot, { rotation: 168, duration: .55, ease: 'back.out(1.6)' }, .25)
      tl.fromTo(q('.sc-dust circle'), { x: 150, y: 60, autoAlpha: 1, scale: 1.4 }, { x: () => gsap.utils.random(30, 280), y: () => gsap.utils.random(-10, 120), autoAlpha: 0, scale: 0, duration: 1.1, ease: 'power2.out', stagger: .04 }, .4)
      popWord(.35)
    } else {
      const six = word[0]?.closest('.st-celebrate')?.dataset.kind === 'six'
      gsap.set(ball, { x: 410, y: 116, scale: 1, rotation: 0, autoAlpha: 1 })
      tl.to(ball, { x: 236, duration: .5, ease: 'none' }, .25)
      tl.to(rot, { rotation: -62, duration: .27, ease: 'power3.in' }, .48)
      tl.to(rot, { rotation: -100, duration: .4, ease: 'power2.out' }, .75)
      impactAt(236, 116, .75)
      if (six) tl.to(ball, { x: 520, duration: .95, ease: 'none' }, .76).to(ball, { y: -120, scale: .35, duration: .95, ease: 'power1.out' }, .76)
      else tl.to(ball, { y: 186, duration: .22, ease: 'power2.in' }, .76).to(ball, { x: 520, rotation: 900, duration: .85, ease: 'power1.out' }, .92)
      popWord(.8)
    }
  } else if (kind === 'stumps') {
    gsap.set(ball, { x: 410, y: 150, scale: 1, autoAlpha: 1 })
    gsap.set(q('.sc-stump, .sc-bail'), { x: 0, y: 0, rotation: 0, autoAlpha: 1, transformOrigin: '50% 100%' })
    tl.to(ball, { x: 262, duration: .45, ease: 'power1.in' }, .25)
    impactAt(250, 150, .7)
    tl.to(q('.sc-stump'), { rotation: i => [-58, 18, 64][i], x: i => [-46, 8, 60][i], y: i => [-6, -14, 4][i], duration: .7, ease: 'power2.out' }, .7)
    tl.to(q('.sc-bail'), { y: -90, x: i => (i ? 70 : -70), rotation: i => (i ? 520 : -520), autoAlpha: 0, duration: .8, ease: 'power2.out' }, .7)
    tl.to(ball, { x: 120, y: 190, rotation: -600, duration: .8, ease: 'power1.out' }, .72)
    popWord(.78)
  } else if (kind === 'pass') {
    gsap.set(ball, { x: 410, y: 70, autoAlpha: 1 })
    tl.to(ball, { x: -30, rotation: -720, duration: 1, ease: 'power1.inOut' }, .3)
    popWord(.45)
  } else if (kind === 'goal') {
    const b = q('.sc-football')
    gsap.set(b, { x: 30, y: 184, rotation: 0, scale: 1 })
    tl.to(b, { x: 322, rotation: 900, duration: .75, ease: 'none' }, .25)
    tl.to(b, { y: 70, duration: .4, ease: 'power2.out' }, .25).to(b, { y: 118, duration: .35, ease: 'power2.in' }, .65)
    tl.fromTo(q('.sc-net'), { scaleX: 1, skewY: 0, transformOrigin: '100% 50%' }, { scaleX: 1.07, skewY: 3, duration: .09, repeat: 5, yoyo: true, ease: 'sine.inOut' }, 1)
    impactAt(322, 118, 1)
    popWord(1)
  } else if (kind === 'smash') {
    const s = q('.sc-shuttle')
    const r = q('.sc-racket')
    gsap.set(r, { rotation: -70, svgOrigin: '0 0' })
    gsap.set(s, { x: 96, y: 118, rotation: 40, autoAlpha: 1 })
    tl.to(r, { rotation: 40, duration: .25, ease: 'power3.in' }, .2)
    tl.to(s, { x: 340, duration: .85, ease: 'none' }, .4)
    tl.to(s, { y: 30, duration: .32, ease: 'power2.out' }, .4).to(s, { y: 190, duration: .5, ease: 'power3.in' }, .72)
    tl.to(s, { rotation: 200, duration: .85, ease: 'none' }, .4)
    impactAt(340, 190, 1.22)
    popWord(1.15)
  }
  tl.to(word, { autoAlpha: 0, y: -18, duration: .35, ease: 'power2.in' }, 2.15)
  tl.to(el, { autoAlpha: 0, duration: .35, ease: 'power1.in' }, 2.3)
  return tl
}

// Full-card celebration. The card's background is replaced by a colour for the event, a short sport scene plays, then the card returns.
export function SportCelebration({ event }) {
  const root = useRef(null)
  useEffect(() => {
    if (!event || event.seeded || !CELEBRATED.includes(event.kind) || reduced()) return
    const el = root.current
    const context = gsap.context(() => play(SCENE[event.kind], el, s => el.querySelectorAll(s)), root)
    return () => context.revert()
  }, [event])
  const kind = event?.kind ?? 'four'
  return <div ref={root} className="st-celebrate" data-kind={kind} aria-hidden="true">
    <Scene kind={SCENE[kind]} />
    <b className="st-cel-word">{event?.word ?? ''}</b>
    {event?.team && <span className="st-cel-sub">{event.team}</span>}
  </div>
}
