import { useEffect, useLayoutEffect, useRef, useState } from 'react'
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
    const tween = gsap.to(shown.current, { n: value, duration: .8, ease: 'power3.out', onUpdate: () => { if (node.current) node.current.textContent = shown.current.n.toFixed(decimals) + suffix } })
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
const SCENE = { four: 'hit', six: 'hit', wicket: 'wicket', wide: 'signal', noball: 'signal', milestone: 'raise', goal: 'goal', point: 'point' }
const FLOOR = 172 // ground line in the 400x200 scene frame
const BALL = 8 // cricket ball radius in scene units

// ---- Real-coloured cricket props, drawn flat ----
function CricketBall() {
  return <g className="c-ball"><g className="c-spin">
    <circle r={BALL} fill="url(#g-ball)" />
    <path d="M-6.2-5q4.4 5 0 10M-4.4-6.6q5 6.6 0 13.2" fill="none" stroke="#f4e4c6" strokeWidth="1" strokeDasharray="1.3 1.3" strokeLinecap="round" />
    <ellipse cx="-2.6" cy="-3.6" rx="2.6" ry="1.6" fill="#fff" opacity=".45" transform="rotate(-35 -2.6 -3.6)" />
  </g></g>
}
function Bat() {
  return <g className="c-bat">
    <rect x="-2.4" y="-5" width="4.8" height="17" rx="2.2" fill="#17181b" />
    <rect x="-2.3" y="11" width="4.6" height="11" fill="#b98a4e" />
    <path d="M-3.6 21h7.2l3.4 42q-6.6 4-13.8 0Z" fill="url(#g-willow)" stroke="#9a6a2e" strokeWidth=".6" />
    <path d="M-3.4 32v24M0 26v33M3.4 32v24" stroke="#a9762f" strokeWidth=".7" opacity=".55" />
    <path d="M-6.4 61q6.4 3.4 12.8 0" fill="none" stroke="#7d4f1f" strokeWidth="1.4" />
    <rect x="-3" y="19" width="6" height="3.2" rx="1" fill="#7a5a2a" />
  </g>
}
function Stumps({ x = 50 }) {
  return <g className="c-stumps">
    {[-6, 0, 6].map(dx => <rect className="c-stump" key={dx} x={x + dx - 2} y="128" width="4" height={FLOOR - 128} rx="1.6" fill="#ecd9ab" stroke="#b79a5e" strokeWidth=".5" />)}
    <rect className="c-bail" x={x - 7} y="124" width="7" height="3.2" rx="1.5" fill="#d9bd7c" /><rect className="c-bail" x={x} y="124" width="7" height="3.2" rx="1.5" fill="#d9bd7c" />
  </g>
}
function Batter() {
  return <g className="c-batter">
    <ellipse cx="86" cy={FLOOR + 1} rx="22" ry="2.6" className="cs-soft" />
    <rect x="76" y="126" width="9.5" height="44" rx="3.4" fill="#f7f7f7" stroke="#c6c6cc" strokeWidth=".8" />
    <rect x="88" y="126" width="9.5" height="44" rx="3.4" fill="#f7f7f7" stroke="#c6c6cc" strokeWidth=".8" />
    <path d="M78 136h5M90 136h5M78 148h5M90 148h5" stroke="#b9b9c0" strokeWidth="1" />
    <rect x="73" y="168" width="15" height="5" rx="2.4" fill="#fff" stroke="#9a9aa2" strokeWidth=".7" /><rect x="88" y="168" width="15" height="5" rx="2.4" fill="#fff" stroke="#9a9aa2" strokeWidth=".7" />
    <rect x="75" y="95" width="23" height="38" rx="8" fill="#fbfbfb" stroke="#cfcfd4" strokeWidth=".8" />
    <path d="M90 103 100 113" stroke="#f3f3f3" strokeWidth="5.4" strokeLinecap="round" />
    <circle cx="100" cy="113" r="3.6" fill="#f7f7f7" stroke="#b9b9c0" strokeWidth=".8" />
    <circle cx="87" cy="86" r="8.4" fill="#0b2a5b" /><rect x="90" y="79.5" width="13" height="3" rx="1.5" fill="#0b2a5b" />
    <path d="M91 86h9M91 90h9M91 94h8" stroke="#c8d2e6" strokeWidth="1" strokeLinecap="round" />
  </g>
}
function Umpire() {
  const arm = side => <g transform={`translate(${side * 9.5} 108)`}><g className={side < 0 ? 'c-arm-l' : 'c-arm-r'}><rect x="-2.6" y="0" width="5.2" height="24" rx="2.6" fill="#f7f7f7" stroke="#c6c6cc" strokeWidth=".7" /><circle cy="25" r="3.2" fill="#e0ac86" /></g></g>
  return <g className="c-umpire" transform="translate(214 0)">
    <ellipse cx="0" cy={FLOOR + 1} rx="13" ry="2.4" className="cs-soft" />
    <rect x="-7" y="138" width="6" height="34" rx="2" fill="#1c1c1f" /><rect x="1" y="138" width="6" height="34" rx="2" fill="#1c1c1f" />
    <rect x="-9.5" y="104" width="19" height="38" rx="6.5" fill="#f7f7f7" stroke="#c6c6cc" strokeWidth=".7" />
    {arm(-1)}{arm(1)}
    <circle cy="96" r="6" fill="#e0ac86" /><path d="M-7.6 94q7.6-9 15.2 0Z" fill="#f4f4f4" stroke="#c6c6cc" strokeWidth=".6" /><rect x="-8.6" y="93.4" width="17.2" height="2.2" rx="1" fill="#f4f4f4" stroke="#c6c6cc" strokeWidth=".5" />
  </g>
}
function FootBall() {
  return <g className="c-ball"><g className="c-spin"><g transform="scale(1.5)"><circle r="11" fill="url(#g-foot)" stroke="#2a2a2e" strokeWidth="1" /><path d="m0-5 5 3.6-1.9 5.8h-6.2L-5-1.4Z" fill="#1d1d20" /><path d="M0-5v-6M5-1.4l6-2M3.1 4.4l4 5M-3.1 4.4l-4 5M-5-1.4l-6-2" stroke="#1d1d20" strokeWidth="1.4" fill="none" /></g></g></g>
}
function Shuttle() {
  return <g className="c-ball"><g className="c-spin"><g transform="scale(1.5)"><path d="M-6-13h12l3 13h-18Z" fill="#fbfbfb" stroke="#8d939e" strokeWidth=".9" /><path d="M-3-13-4-1M0-13v12M3-13l1 12M-7.5-6h15" stroke="#b5bac4" strokeWidth=".9" fill="none" /><circle cy="4" r="5" fill="#d8b98c" stroke="#8a6a3a" strokeWidth=".9" /><ellipse cx="-1.6" cy="2.4" rx="1.8" ry="2.6" fill="#fff" opacity=".6" /></g></g></g>
}

function Scene({ kind }) {
  return <svg className="st-cel-scene" viewBox="-14 8 428 184" preserveAspectRatio="xMidYMax meet" aria-hidden="true">
    <defs>
      <radialGradient id="g-ball" cx=".34" cy=".3" r=".9"><stop offset="0" stopColor="#e5343d" /><stop offset=".55" stopColor="#b0121c" /><stop offset="1" stopColor="#5e070d" /></radialGradient>
      <linearGradient id="g-willow" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#f1d8a4" /><stop offset=".5" stopColor="#e3bd80" /><stop offset="1" stopColor="#c99656" /></linearGradient>
      <radialGradient id="g-foot" cx=".35" cy=".3" r=".9"><stop offset="0" stopColor="#fff" /><stop offset="1" stopColor="#cfd3da" /></radialGradient>
      <linearGradient id="g-grass" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="var(--c-grass-near)" /><stop offset="1" stopColor="var(--c-grass-far)" /></linearGradient>
    </defs>
    <rect x="-2000" y={FLOOR} width="4400" height="60" className="c-turf" />
    <g className="c-field-lines"><path d="M-14 184h428M-14 191h428" fill="none" stroke="var(--c-grass-line)" strokeWidth="2" />{!['goal', 'point'].includes(kind) && <><path d="M30 177h110l18 15H12Z" fill="var(--c-pitch)" opacity=".7" /><path d="M44 180h88M36 189h104" fill="none" stroke="#fff9e8" strokeWidth="1" opacity=".65" /></>}</g>
    <line x1="-2000" y1={FLOOR} x2="2400" y2={FLOOR} className="cs-mute" strokeWidth="1.6" />
    {(kind === 'hit' || kind === 'wicket' || kind === 'signal' || kind === 'raise') && <><rect x="40" y={FLOOR} width="300" height="3" className="c-pitch" /><Stumps /></>}
    {kind === 'hit' && <>
      <g className="c-board"><rect x="356" y="140" width="80" height="32" rx="4" className="cs-soft" /><path d="M368 172l13-32M388 172l13-32M408 172l13-32" className="cs-mute" strokeWidth="6.5" /></g>
      <g className="c-rope"><path d="M312 172h18" className="cs-line" strokeWidth="3" strokeDasharray="4 4" /><path className="c-flag cs-fill" d="M321 172v-27l13 5-13 7" /></g>
      <g className="c-light"><circle className="c-glow cs-fill" cx="378" cy="62" r="14" opacity="0" /><path d="M378 172V70" className="cs-mute" strokeWidth="3" /><rect x="364" y="54" width="28" height="16" rx="3" className="cs-fill" /></g>
      <g className="c-crowd">{Array.from({ length: 9 }, (_, i) => <g className="c-fan" key={i}><circle cx={232 + i * 12} cy="158" r="4.3" className="cs-soft" /><rect x={228 + i * 12} y="162" width="8.2" height="10" rx="3" className="cs-soft" /></g>)}</g>
    </>}
    {(kind === 'hit' || kind === 'wicket' || kind === 'signal' || kind === 'raise') && <><Batter /><g transform="translate(100 113)"><Bat /></g></>}
    {kind === 'signal' && <Umpire />}
    {kind === 'raise' && <g className="c-crowd">{Array.from({ length: 10 }, (_, i) => <g className="c-fan" key={i}><circle cx={230 + i * 14} cy="158" r="4.3" className="cs-soft" /><rect x={226 + i * 14} y="162" width="8.2" height="10" rx="3" className="cs-soft" /></g>)}</g>}
    {kind === 'goal' && <g className="c-goal"><g className="c-net">{Array.from({ length: 9 }, (_, i) => <line key={`v${i}`} x1={300 + i * 11} y1="90" x2={300 + i * 11} y2={FLOOR} className="cs-mute" strokeWidth="1.2" />)}{Array.from({ length: 7 }, (_, i) => <line key={`h${i}`} x1="298" y1={100 + i * 12} x2="392" y2={100 + i * 12} className="cs-mute" strokeWidth="1.2" />)}</g><path d="M296 172V86h100v86" className="cs-line" strokeWidth="4" strokeLinejoin="round" fill="none" /></g>}
    {kind === 'point' && <>
      <g className="c-net2"><rect x="196" y="110" width="8" height="62" rx="2" className="cs-soft" /><path d="M200 112v60" className="cs-mute" strokeWidth="8" strokeDasharray="2 3" /><rect x="190" y="106" width="20" height="5" rx="2.5" fill="#f4f4f4" /></g>
      <g transform="translate(58 128)"><g className="c-racket"><rect x="-2" y="0" width="4" height="34" rx="2" fill="#2b2e34" /><ellipse cx="0" cy="-14" rx="11" ry="15" fill="none" stroke="#2b2e34" strokeWidth="3" /><path d="M-9-14h18M0-27v26" className="cs-mute" strokeWidth="1" /></g></g>
    </>}
    <g className="c-trail">{Array.from({ length: 7 }, (_, i) => <circle key={i} r={BALL - i * .8} fill="#b0121c" />)}</g>
    <ellipse className="c-shadow cs-soft" cx="0" cy={FLOOR + 1} rx="8" ry="2.2" />
    <g className="c-cams">{[[30, 60], [70, 40], [120, 52], [170, 36], [230, 58], [280, 42], [330, 66], [370, 48], [60, 100], [310, 96], [150, 90], [250, 84]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="2.4" className="cs-white" opacity="0" />)}</g>
    <g className="c-rays">{Array.from({ length: 20 }, (_, i) => <line key={i} x1="0" y1="-24" x2="0" y2="-74" className="cs-spark" strokeWidth="1.6" strokeLinecap="round" transform={`rotate(${i * 18})`} />)}</g>
    <g className="c-sparks">{Array.from({ length: 10 }, (_, i) => <line key={i} x1="0" y1="-12" x2="0" y2="-24" className="cs-spark" strokeWidth="2.6" strokeLinecap="round" transform={`rotate(${i * 36})`} />)}</g>
    <circle className="c-impact cs-line" r="12" fill="none" strokeWidth="3" opacity="0" />
    <g className="c-dust">{Array.from({ length: 6 }, (_, i) => <circle key={i} r="3" className="cs-soft" opacity="0" />)}</g>
    {kind === 'goal' ? <FootBall /> : kind === 'point' ? <Shuttle /> : <CricketBall />}
    <g className="c-conf">{Array.from({ length: 14 }, (_, i) => <rect key={i} width="5" height="2.5" rx="1" fill={['#d7ad55', '#ebf2ee', '#619779'][i % 3]} opacity="0" />)}</g>
  </svg>
}

const spinFor = distance => (distance / BALL) * 57.3
function play(el, kind) {
  const q = s => el.querySelectorAll(s)
  const one = s => el.querySelector(s)
  const tl = gsap.timeline({ onComplete: () => gsap.set(el, { autoAlpha: 0 }) })
  const word = one('.st-cel-word')
  const ball = one('.c-ball')
  const spin = one('.c-spin')
  const scene = one('.st-cel-scene')
  gsap.set(ball, { autoAlpha: 0, transformOrigin: `0px ${BALL}px`, scale: 1 })
  gsap.set(q('.c-conf rect, .c-dust circle, .c-trail circle, .c-shadow'), { autoAlpha: 0 })
  gsap.set(q('.c-sparks, .c-rays, .c-cams circle'), { autoAlpha: 0 })
  gsap.set(word, { autoAlpha: 0 })

  // Decaying random shake: the whole scene (and the word) vibrates on impact.
  const rumble = (target, at, amp, dur = .6, step = .032) => {
    amp = Math.min(amp, 1.2)
    const n = Math.round(dur / step)
    for (let i = 0; i < n; i++) {
      const k = 1 - i / n
      tl.to(target, { x: gsap.utils.random(-amp, amp) * k, y: gsap.utils.random(-amp, amp) * k, duration: step, ease: 'none' }, at + i * step)
    }
    tl.to(target, { x: 0, y: 0, duration: step }, at + n * step)
  }
  const rays = (at, x, y) => {
    tl.set(one('.c-rays'), { x, y, scale: .25, autoAlpha: 1, transformOrigin: '0px 0px' }, at)
    tl.to(one('.c-rays'), { scale: 2.1, duration: .42, ease: 'power3.out' }, at)
    tl.to(one('.c-rays'), { autoAlpha: 0, duration: .3 }, at + .12)
  }
  // Stadium camera flashes twinkle around the frame.
  const cams = at => tl.fromTo(q('.c-cams circle'), { autoAlpha: 0, scale: .8 }, { autoAlpha: .45, scale: 1.1, duration: .2, yoyo: true, repeat: 1, stagger: .035, transformOrigin: '50% 50%' }, at)
  // Camera punch: the frame zooms and tilts on impact, then springs back.
  const punch = at => {
    tl.fromTo(scene, { scale: 1, rotation: 0, transformOrigin: '50% 70%' }, { scale: 1.025, rotation: 0, duration: .18, ease: 'power2.out' }, at)
    tl.to(scene, { scale: 1, duration: .45, ease: 'power2.out' }, at + .18)
  }
  const flash = (at, strength = .55) => tl.fromTo(one('.st-cel-flash'), { autoAlpha: 0 }, { autoAlpha: Math.min(strength, .12), duration: .18, yoyo: true, repeat: 1, ease: 'sine.inOut' }, at)
  const sparks = (at, x, y) => {
    tl.set(one('.c-sparks'), { x, y, scale: .3, autoAlpha: 1 }, at)
    tl.to(one('.c-sparks'), { scale: 1.5, duration: .28, ease: 'power3.out' }, at)
    tl.to(one('.c-sparks'), { autoAlpha: 0, duration: .22 }, at + .1)
  }
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
    tl.set(puff, { x, y, autoAlpha: .85, scale: 1 }, at)
    tl.to(puff, { x: x + (i - 2.5) * 9, y: y - gsap.utils.random(8, 22), scale: 2.4, autoAlpha: 0, duration: .55, ease: 'power2.out' }, at)
  })
  const impact = (at, x, y) => tl.fromTo(one('.c-impact'), { x, y, scale: .3, autoAlpha: 1 }, { scale: 3, autoAlpha: 0, duration: .45, ease: 'power2.out' }, at)
  // Kinetic word: letters slam in one after another, a light sweeps across, then the word vibrates.
  const slam = (at, amp = 7) => {
    const chars = q('.st-cel-word .ch')
    tl.set(word, { autoAlpha: 1, scale: 1, y: 0 }, at)
    tl.fromTo(chars, { autoAlpha: 0, y: 12, scale: .97, rotation: 0 }, { autoAlpha: 1, y: 0, scale: 1, rotation: 0, duration: .4, ease: 'power3.out', stagger: .025 }, at)
    tl.fromTo(one('.st-cel-sweep'), { xPercent: -130, autoAlpha: .95 }, { xPercent: 130, duration: .7, ease: 'power2.inOut' }, at + .25)
    rumble(word, at + .32, Math.min(amp, .5), .3)
  }
  const squashHop = (at, base, amp) => {
    tl.to(ball, { y: base - amp, duration: .13, ease: 'power2.out' }, at)
    tl.to(ball, { y: base, duration: .13, ease: 'power2.in' }, at + .13)
    tl.to(ball, { scaleX: 1.035, scaleY: .965, duration: .04, yoyo: true, repeat: 1 }, at + .25)
  }
  // A bowler's delivery: releases high on the right, drops under gravity, pitches, then rises to the batter.
  const delivery = (target, postDuration, endY) => {
    const base = FLOOR - BALL
    gsap.set(ball, { x: 410, y: 62, autoAlpha: 1 })
    tl.to(ball, { x: 240, duration: .37, ease: 'none' }, .05)
    tl.to(ball, { y: base, duration: .37, ease: 'power2.in' }, .05)
    tl.to(spin, { rotation: -1100, duration: .6, ease: 'none' }, .05)
    tl.to(ball, { scaleX: 1.035, scaleY: .965, duration: .04, yoyo: true, repeat: 1 }, .4)
    dust(.42, 240, FLOOR - 3)
    tl.to(ball, { x: target, duration: postDuration, ease: 'none' }, .42)
    tl.to(ball, { y: endY, duration: postDuration, ease: 'power1.out' }, .42)
  }

  tl.fromTo(el, { autoAlpha: 0 }, { autoAlpha: 1, duration: .2, ease: 'power1.out' }, 0)

  if (kind === 'hit') {
    const isSix = el.dataset.kind === 'six'
    const bat = one('.c-bat')
    const base = FLOOR - BALL
    gsap.set(bat, { rotation: 100, transformOrigin: '0px 0px' })
    delivery(121, .2, 149)
    tl.to(bat, { rotation: -30, duration: .18, ease: 'power3.in' }, .44)
    tl.to(bat, { rotation: -108, duration: .35, ease: 'power2.out' }, .62)
    impact(.62, 121, 149); sparks(.62, 121, 149); rays(.62, 121, 149); flash(.62, .5); rumble(scene, .62, 7, .55); punch(.62)
    if (isSix) {
      const launch = index => {
        const t = index === 0 ? ball : q('.c-trail circle')[index - 1]
        const d = index * .045
        tl.to(t, { x: 480, duration: 1.05, ease: 'none' }, .64 + d)
        tl.to(t, { y: 26, duration: .5, ease: 'power2.out' }, .64 + d)
        tl.to(t, { y: 92, duration: .6, ease: 'power2.in' }, 1.14 + d)
      }
      tl.set(ball, { scaleX: 1, scaleY: 1 }, .62)
      launch(0)
      tl.to(spin, { rotation: -1900, duration: 1.05, ease: 'none' }, .64)
      q('.c-trail circle').forEach((dot, i) => {
        gsap.set(dot, { x: 121, y: 149 })
        tl.set(dot, { autoAlpha: .5 - i * .06 }, .64 + (i + 1) * .045)
        launch(i + 1)
        tl.to(dot, { autoAlpha: 0, duration: .2 }, 1.45 + (i + 1) * .045)
      })
      tl.to(q('.c-fan'), { y: -9, duration: .15, yoyo: true, repeat: 3, ease: 'sine.inOut', stagger: .04 }, 1.1)
      tl.fromTo(one('.c-glow'), { autoAlpha: .8, scale: 1, transformOrigin: '50% 50%' }, { autoAlpha: 0, scale: 3.2, duration: .8, ease: 'power2.out' }, 1.1)
      slam(.72, 8); confetti(1.12, 336, 120, 1.25); cams(1.1)
    } else {
      const shadow = one('.c-shadow')
      tl.set(shadow, { x: 121, autoAlpha: .55 }, .62)
      tl.to(ball, { y: base, duration: .14, ease: 'power2.in' }, .62)
      tl.to(ball, { x: 340, duration: 1, ease: 'power2.out' }, .62)
      tl.to(shadow, { x: 340, duration: 1, ease: 'power2.out' }, .62)
      tl.to(spin, { rotation: spinFor(220) + 2000, duration: 1, ease: 'power2.out' }, .62)
      ;[[.8, 16], [1.0, 8], [1.18, 3]].forEach(([t, a]) => squashHop(t, base, a))
      dust(.76, 140, FLOOR - 3)
      tl.to(one('.c-rope'), { scaleY: 1.5, transformOrigin: '50% 100%', duration: .1, yoyo: true, repeat: 3, ease: 'sine.inOut' }, 1.28)
      tl.to(one('.c-flag'), { rotation: 16, transformOrigin: '0% 100%', duration: .1, yoyo: true, repeat: 7, ease: 'sine.inOut' }, 1.28)
      tl.to(one('.c-board'), { x: 4, duration: .05, yoyo: true, repeat: 5 }, 1.5)
      dust(1.3, 336, FLOOR - 3)
      slam(1.3, 8); flash(1.3, .35); rumble(scene, 1.3, 5, .45); confetti(1.34, 340, 130, 1); cams(1.28); punch(1.3)
    }
  } else if (kind === 'wicket') {
    const bat = one('.c-bat')
    gsap.set(bat, { rotation: 100, transformOrigin: '0px 0px' })
    gsap.set(q('.c-stump'), { transformOrigin: '50% 100%' })
    delivery(55, .36, 150)
    tl.to(bat, { rotation: -70, duration: .24, ease: 'power3.in' }, .6)
    // The ball strikes the stumps behind the batter at t = .78: stumps are knocked backwards (to the left) and the bails fly.
    impact(.78, 55, 150); sparks(.78, 55, 150); rays(.78, 55, 150); flash(.78, .7); rumble(scene, .78, 10, .65); punch(.78)
    const stumps = q('.c-stump')
    tl.to(stumps[0], { rotation: -34, x: -22, duration: .5, ease: 'power2.out' }, .78)
    tl.to(stumps[1], { rotation: -74, x: -46, y: -8, duration: .55, ease: 'power2.out' }, .78)
    tl.to(stumps[2], { rotation: -50, x: -30, duration: .5, ease: 'power2.out' }, .78)
    q('.c-bail').forEach((bail, i) => {
      tl.to(bail, { x: i ? -28 : -62, duration: .8, ease: 'none' }, .78)
      tl.to(bail, { y: -56, duration: .3, ease: 'power2.out' }, .78)
      tl.to(bail, { y: FLOOR - 128, duration: .5, ease: 'power2.in' }, 1.08)
      tl.to(bail, { rotation: i ? -620 : -420, duration: .8, ease: 'none' }, .78)
    })
    tl.to(ball, { x: 8, duration: .6, ease: 'power1.out' }, .8)
    tl.to(ball, { y: 118, duration: .22, ease: 'power2.out' }, .8).to(ball, { y: FLOOR - BALL, duration: .5, ease: 'bounce.out' }, 1.02)
    slam(.8, 10)
  } else if (kind === 'signal') {
    const bat = one('.c-bat')
    const noBall = el.dataset.kind === 'noball'
    gsap.set(bat, { rotation: 100, transformOrigin: '0px 0px' })
    gsap.set(q('.c-arm-l, .c-arm-r'), { rotation: 0, transformOrigin: '0px 0px' })
    delivery(-30, .7, 104)
    tl.to(bat, { rotation: 62, duration: .3, ease: 'power2.inOut' }, .3).to(bat, { rotation: 100, duration: .3, ease: 'power2.inOut' }, .65)
    tl.to(one('.c-arm-r'), { rotation: -90, duration: .3, ease: 'back.out(2.4)' }, .75)
    if (!noBall) tl.to(one('.c-arm-l'), { rotation: 90, duration: .3, ease: 'back.out(2.4)' }, .75)
    tl.to(q('.c-arm-l, .c-arm-r'), { y: 1.4, duration: .04, yoyo: true, repeat: 15 }, 1.05)
    flash(.78, .35); rumble(scene, .8, 5, .45); slam(.78, 6)
  } else if (kind === 'raise') {
    const bat = one('.c-bat')
    gsap.set(bat, { rotation: 8, transformOrigin: '0px 0px' })
    tl.to(bat, { rotation: 172, duration: .55, ease: 'back.out(1.8)' }, .15)
    tl.to(bat, { rotation: 164, duration: .09, yoyo: true, repeat: 7 }, .8)
    tl.to(q('.c-fan'), { y: -10, duration: .16, yoyo: true, repeat: 5, ease: 'sine.inOut', stagger: .04 }, .55)
    sparks(.62, 100, 62); rays(.62, 120, 70); flash(.6, .4); rumble(scene, .6, 5, .5); cams(.6); punch(.6)
    slam(.5, 7); confetti(.62, 120, 70, 1.3)
  } else if (kind === 'goal') {
    const base = FLOOR - 16.5
    gsap.set(ball, { x: 30, y: base, autoAlpha: 1, transformOrigin: '0px 16.5px' })
    tl.to(ball, { x: 344, duration: 1, ease: 'none' }, .15)
    tl.to(ball, { y: 58, duration: .5, ease: 'power2.out' }, .15)
    tl.to(ball, { y: 124, duration: .5, ease: 'power2.in' }, .65)
    tl.to(spin, { rotation: 900, duration: 1, ease: 'none' }, .15)
    tl.to(one('.c-net'), { scaleX: 1.08, skewY: 4, transformOrigin: '100% 50%', duration: .09, yoyo: true, repeat: 7, ease: 'sine.inOut' }, 1.12)
    tl.to(ball, { x: 360, duration: .3, ease: 'power2.out' }, 1.15)
    tl.to(ball, { y: base, duration: .5, ease: 'bounce.out' }, 1.15)
    impact(1.12, 344, 124); sparks(1.12, 344, 124); rays(1.12, 344, 124); flash(1.12, .5); rumble(scene, 1.12, 8, .6); cams(1.1); punch(1.12)
    slam(1.12, 9); confetti(1.16, 345, 110, 1.1)
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
    impact(1.16, 332, FLOOR - 4); sparks(1.16, 332, FLOOR - 6); rays(1.16, 332, FLOOR - 6); dust(1.16, 332, FLOOR - 3); flash(1.16, .5); rumble(scene, 1.16, 8, .6); punch(1.16)
    slam(1.14, 9); confetti(1.18, 332, 130, 1)
  }
  tl.to(word, { autoAlpha: 0, y: -14, scale: .94, duration: .3, ease: 'power2.in' }, 2.2)
  tl.to(el, { autoAlpha: 0, duration: .3, ease: 'power1.in' }, 2.45)
  return tl
}

// A 2D celebration inside the card frame. Colours follow the theme: black and blue (dark) or white and blue (light).
// Only celebrated events start an animation; ordinary deliveries that arrive mid-animation never cut it short.
export function SportCelebration({ event, sport = 'cricket' }) {
  const root = useRef(null)
  const [state, setState] = useState({ seen: null, queue: [] })
  if (event !== state.seen) {
    const received = (event?.sequence ?? (event ? [event] : [])).filter(item => !item.seeded && CELEBRATED.includes(item.kind))
    setState({ seen: event, queue: event ? [...state.queue, ...received].slice(-12) : [] })
  }
  const active = state.queue[0] ?? null
  useEffect(() => {
    if (!active) return
    const timer = window.setTimeout(() => setState(previous => ({ ...previous, queue: previous.queue.slice(1) })), reduced() ? 0 : 2800)
    return () => window.clearTimeout(timer)
  }, [active])
  useEffect(() => {
    if (!active || reduced()) return
    const el = root.current
    const context = gsap.context(() => play(el, SCENE[active.kind]), root)
    return () => context.revert()
  }, [active, sport])
  const kind = active?.kind ?? 'four'
  return <div ref={root} className="st-celebrate" data-kind={kind} data-sport={sport} aria-hidden="true">
    <Scene kind={SCENE[kind]} />
    <div className="st-cel-flash" />
    <b className="st-cel-word">{[...(active?.word ?? '')].map((ch, i) => <span className="ch" key={i}>{ch}</span>)}</b>
    <div className="st-cel-sweep" />
    {active?.team && <span className="st-cel-sub">{active.team}</span>}
  </div>
}
