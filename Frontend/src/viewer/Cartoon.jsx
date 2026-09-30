import { useId } from 'react'

const hash = value => [...String(value ?? '')].reduce((n, c) => (n * 31 + c.charCodeAt(0)) >>> 0, 7)
const SKIN = ['#f6c9a0', '#e9a877', '#c98553', '#9c6238', '#7a4a2b', '#f3d3b5']
const HAIR = ['#2b1d16', '#4a2c1a', '#1a1a1f', '#7b4a21', '#22303f', '#5a2d2d']
const JERSEY = [['#2f6bff', '#8fb2ff'], ['#e5484d', '#ff9b9e'], ['#12a594', '#7be0d2'], ['#f5a524', '#ffd98a'], ['#8e4ec6', '#c9a3ee'], ['#0ea5e9', '#8ddcff']]

// Puppet-style avatar: flat shapes, chunky outline, no photographic detail.
export function CartoonAvatar({ seed, team, className = '', mood = 'happy' }) {
  const uid = useId().replace(/:/g, '')
  const h = hash(seed)
  const skin = SKIN[h % SKIN.length]
  const hair = HAIR[(h >> 3) % HAIR.length]
  const [j1, j2] = JERSEY[team != null ? hash(team) % JERSEY.length : (h >> 5) % JERSEY.length]
  const style = (h >> 7) % 4
  const eyes = (h >> 9) % 2
  return <svg className={`st-cartoon ${className}`} viewBox="0 0 96 110" role="img" aria-hidden="true" data-mood={mood}>
    <defs>
      <linearGradient id={`j${uid}`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={j2} /><stop offset="1" stopColor={j1} /></linearGradient>
      <radialGradient id={`s${uid}`} cx=".35" cy=".3" r=".9"><stop offset="0" stopColor="#fff" stopOpacity=".45" /><stop offset="1" stopColor={skin} stopOpacity="0" /></radialGradient>
    </defs>
    <g className="st-cartoon-body" stroke="#1b1b2f" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round">
      <path d="M10 110c0-24 14-36 38-36s38 12 38 36Z" fill={`url(#j${uid})`} />
      <path d="M38 76c2 8 8 12 10 12s8-4 10-12" fill="#fff" fillOpacity=".92" />
      <rect x="41" y="62" width="14" height="16" rx="6" fill={skin} />
      <g className="st-cartoon-head">
        {style === 0 && <path d="M18 40c-2-24 14-34 30-34s32 10 30 34c-6-12-18-16-30-16S24 28 18 40Z" fill={hair} />}
        <ellipse cx="48" cy="42" rx="27" ry="27" fill={skin} />
        <ellipse cx="48" cy="42" rx="27" ry="27" fill={`url(#s${uid})`} stroke="none" />
        {style === 1 && <path d="M20 38c-4-26 14-32 28-32 16 0 32 8 28 32-4-8-8-14-14-16-8 6-24 6-34 0-4 4-6 10-8 16Z" fill={hair} />}
        {style === 2 && <><path d="M19 40c-3-26 12-36 29-36s32 10 29 36c-2-10-6-18-10-20H29c-4 2-8 10-10 20Z" fill={hair} /><path d="M18 30c8-12 52-12 60 0v3H18Z" fill={j1} /><path d="M12 33h72c-2 5-8 6-14 5H26c-6 1-12 0-14-5Z" fill={j1} /></>}
        {style === 3 && <><path d="M20 34c2-20 14-28 28-28s26 8 28 28c-8-8-18-12-28-12S28 26 20 34Z" fill={j1} /><path d="M14 36c10-4 60-4 68 0-2 6-12 4-34 4s-32 2-34-4Z" fill={j2} /></>}
        <ellipse cx="21" cy="46" rx="4" ry="6" fill={skin} /><ellipse cx="75" cy="46" rx="4" ry="6" fill={skin} />
        <g className="st-cartoon-eyes" stroke="none">
          <ellipse cx="38" cy="44" rx={eyes ? 5 : 4} ry={eyes ? 6.5 : 5.5} fill="#fff" /><ellipse cx="58" cy="44" rx={eyes ? 5 : 4} ry={eyes ? 6.5 : 5.5} fill="#fff" />
          <circle cx="39" cy="45" r="2.6" fill="#1b1b2f" /><circle cx="59" cy="45" r="2.6" fill="#1b1b2f" />
        </g>
        <path d="M31 35c3-3 9-3 11 0M54 35c3-3 8-3 11 0" fill="none" strokeWidth="2.4" />
        {mood === 'sad' ? <path d="M39 61c4-5 14-5 18 0" fill="none" strokeWidth="3" /> : <path d="M38 55c4 9 16 9 20 0Z" fill="#fff" strokeWidth="2.6" />}
        <circle cx="30" cy="54" r="4" fill="#ff7a8a" fillOpacity=".38" stroke="none" /><circle cx="66" cy="54" r="4" fill="#ff7a8a" fillOpacity=".38" stroke="none" />
      </g>
    </g>
  </svg>
}

const SHAPES = [
  'M32 4 56 12v20c0 14-10 24-24 28C18 56 8 46 8 32V12Z', // shield
  'M32 3 57 17v30L32 61 7 47V17Z', // hexagon
  'M32 4a28 28 0 1 1 0 56 28 28 0 0 1 0-56Z', // roundel
  'M32 3 60 32 32 61 4 32Z', // diamond
]
const EMBLEMS = [
  'M32 16l4.6 9.6 10.4 1.4-7.6 7.2 1.9 10.4L32 39.6l-9.3 5 1.9-10.4L17 27l10.4-1.4Z', // star
  'M36 14 22 36h9l-3 14 15-24h-9Z', // bolt
  'M32 14c2 8 12 12 12 22a12 12 0 0 1-24 0c0-6 4-8 5-14 3 2 5 4 5 8 2-4 3-9 2-16Z', // flame
  'M14 40c6-8 10-8 16 0s10 8 18 0M14 30c6-8 10-8 16 0s10 8 18 0', // wave (stroked)
  'M32 15c8 0 14 6 14 13 0 6-3 8-6 10l3 10H21l3-10c-3-2-6-4-6-10 0-7 6-13 14-13Z', // pawn
]
const TEAM_PALETTES = {
  blue: ['#1e56ff', '#0b2a8f', '#8fb2ff', 0, 1],
  red: ['#f0383f', '#8f1220', '#ffb0b4', 1, 2],
  green: ['#12a86a', '#0a5a3c', '#8ce8bf', 3, 4],
  yellow: ['#ffb400', '#a86200', '#ffe08a', 2, 0],
}

function teamKey(name = '') {
  const first = String(name).toLowerCase().split(/\s+/)[0]
  return TEAM_PALETTES[first] ? first : null
}

const FALLBACK = [['#c9a3ee', '#8e4ec6', '#f0dcff'], ['#7cc4ff', '#0a84ff', '#d6eeff'], ['#ffb27a', '#ef6c00', '#ffe1c8'], ['#ff9cc4', '#e11d74', '#ffd6e8']]

// Claymorphic crests: Blue and Red houses get two clearly different logos; any other name gets a stable generated crest.
export function TeamLogo({ name = '', size = 44, className = '' }) {
  const uid = useId().replace(/:/g, '')
  const key = teamKey(name)
  const h = hash(name)
  const [a, b, c, shape, emblem] = key ? TEAM_PALETTES[key] : [...FALLBACK[h % FALLBACK.length], h % SHAPES.length, (h >> 3) % EMBLEMS.length]
  const stroked = emblem === 3
  return <svg className={`st-team-logo ${className}`} width={size} height={size} viewBox="0 0 64 64" role="img" aria-label={`${name} logo`}>
    <defs>
      <linearGradient id={`t${uid}`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={c} /><stop offset=".35" stopColor={a} /><stop offset="1" stopColor={b} /></linearGradient>
      <filter id={`s${uid}`} x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="3" stdDeviation="2.2" floodColor={b} floodOpacity=".45" /></filter>
    </defs>
    <path d={SHAPES[shape]} fill={`url(#t${uid})`} filter={`url(#s${uid})`} />
    <path d={SHAPES[shape]} fill="none" stroke="#fff" strokeOpacity=".55" strokeWidth="1.6" transform="translate(32 32) scale(.86) translate(-32 -32)" />
    <ellipse cx="22" cy="17" rx="5" ry="9" fill="#fff" opacity=".45" transform="rotate(35 22 17)" />
    <path d={EMBLEMS[emblem]} fill={stroked ? 'none' : '#fff'} stroke="#fff" strokeWidth={stroked ? 4 : 0} strokeLinecap="round" strokeLinejoin="round" style={{ filter: `drop-shadow(0 1px 1px ${b})` }} />
  </svg>
}
