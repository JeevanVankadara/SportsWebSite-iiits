import { useId } from 'react'

// Claymorphic icons: soft gradient bodies, a glossy highlight and a blurred ground shadow. Purely decorative.
const PALETTE = {
  gold: ['#ffe27a', '#ff9f0a'],
  goldDark: ['#ffb340', '#c76a00'],
  red: ['#ff8a80', '#e5352b'],
  blue: ['#7cc4ff', '#0a84ff'],
  wood: ['#f7cf8f', '#d68a2e'],
  white: ['#ffffff', '#d5d9e0'],
  ink: ['#5b5f6a', '#23252c'],
  green: ['#7be495', '#22a95a'],
  purple: ['#d3a4ff', '#8e4ec6'],
}

function Frame({ children, size, label }) {
  return <svg className="st-clay" width={size} height={size} viewBox="0 0 64 64" role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : 'true'} focusable="false">{children}</svg>
}

export default function ClayIcon({ kind = 'trophy', size = 40, label }) {
  const uid = useId().replace(/:/g, '')
  const grad = (name, id, dir = [0, 0, 1, 1]) => <linearGradient id={`${id}${uid}`} x1={dir[0]} y1={dir[1]} x2={dir[2]} y2={dir[3]}><stop offset="0" stopColor={PALETTE[name][0]} /><stop offset="1" stopColor={PALETTE[name][1]} /></linearGradient>
  const fill = id => `url(#${id}${uid})`
  const shadow = <ellipse cx="32" cy="58" rx="18" ry="3.2" fill="#000" opacity=".18" />
  const gloss = (cx, cy, rx, ry, rot = -30) => <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="#fff" opacity=".55" transform={`rotate(${rot} ${cx} ${cy})`} />

  if (kind === 'trophy') return <Frame size={size} label={label}>
    <defs>{grad('gold', 'a')}{grad('goldDark', 'b')}</defs>
    {shadow}
    <path d="M18 16c-8 0-9 12 1 16" fill="none" stroke={fill('b')} strokeWidth="5" strokeLinecap="round" />
    <path d="M46 16c8 0 9 12-1 16" fill="none" stroke={fill('b')} strokeWidth="5" strokeLinecap="round" />
    <rect x="27" y="36" width="10" height="10" rx="3" fill={fill('b')} />
    <rect x="18" y="45" width="28" height="11" rx="5" fill={fill('b')} />
    <path d="M16 8h32v16c0 11-7 18-16 18S16 35 16 24Z" fill={fill('a')} />
    <path d="m32 15 2.6 5.3 5.8.8-4.2 4.1 1 5.8L32 28.2l-5.2 2.8 1-5.8-4.2-4.1 5.8-.8Z" fill="#fff" opacity=".9" />
    {gloss(23, 18, 2.6, 8)}
  </Frame>

  if (kind === 'cricket') return <Frame size={size} label={label}>
    <defs>{grad('wood', 'a')}{grad('ink', 'b')}{grad('red', 'c')}</defs>
    {shadow}
    <g transform="rotate(38 26 30)">
      <rect x="22" y="6" width="9" height="18" rx="4.5" fill={fill('b')} />
      <rect x="17" y="20" width="19" height="34" rx="8" fill={fill('a')} />
      <rect x="21" y="26" width="3" height="20" rx="1.5" fill="#fff" opacity=".45" />
    </g>
    <circle cx="46" cy="42" r="11" fill={fill('c')} />
    <path d="M38 38c5 1 9 5 10 11M41 35c5 1 9 5 11 11" fill="none" stroke="#fff" strokeOpacity=".8" strokeWidth="1.6" strokeLinecap="round" strokeDasharray="2 2.6" />
    {gloss(42, 37, 2.4, 4.6, -40)}
  </Frame>

  if (kind === 'football') return <Frame size={size} label={label}>
    <defs>{grad('white', 'a')}{grad('ink', 'b')}</defs>
    {shadow}
    <circle cx="32" cy="31" r="24" fill={fill('a')} />
    <path d="m32 20 9 6.5-3.4 10.5H26.4L23 26.5Z" fill={fill('b')} />
    <path d="M32 20v-9M41 26.5l9-3M37.6 37l6 8M26.4 37l-6 8M23 26.5l-9-3" fill="none" stroke="#3a3d47" strokeWidth="2.2" strokeLinecap="round" />
    {gloss(22, 18, 3.6, 8, -35)}
  </Frame>

  if (kind === 'badminton') return <Frame size={size} label={label}>
    <defs>{grad('white', 'a', [0, 0, 0, 1])}{grad('gold', 'b')}{grad('blue', 'c')}</defs>
    {shadow}
    <g transform="rotate(-28 32 32)">
      <path d="M22 8h20l6 30H16Z" fill={fill('a')} />
      <path d="M26 8 24 38M32 8v30M38 8l2 30" stroke="#b7bdc9" strokeWidth="1.6" fill="none" />
      <path d="M17 24h30" stroke="#b7bdc9" strokeWidth="1.4" />
      <circle cx="32" cy="46" r="10" fill={fill('b')} />
      <rect x="22" y="36" width="20" height="4.5" rx="2.2" fill={fill('c')} />
      {gloss(28, 44, 2.2, 4.4, -20)}
    </g>
  </Frame>

  if (kind === 'kabaddi') return <Frame size={size} label={label}>
    <defs>{grad('blue', 'a')}{grad('white', 'b')}</defs>
    {shadow}
    <rect x="7" y="14" width="50" height="37" rx="5" fill={fill('a')} />
    <path d="M32 14v37M7 32.5h50M18 14v37M46 14v37" fill="none" stroke="#fff" strokeWidth="2" strokeOpacity=".85" />
    <circle cx="32" cy="32.5" r="6" fill={fill('b')} stroke="#1853aa" strokeWidth="2" />
    {gloss(20, 21, 9, 3)}
  </Frame>

  if (kind === 'users') return <Frame size={size} label={label}>
    <defs>{grad('blue', 'a')}{grad('purple', 'b')}{grad('wood', 'c')}</defs>
    {shadow}
    <path d="M6 52c0-10 6-15 14-15s14 5 14 15Z" fill={fill('b')} />
    <circle cx="20" cy="26" r="9" fill={fill('c')} />
    <path d="M22 52c0-11 6-17 15-17s15 6 15 17Z" fill={fill('a')} />
    <circle cx="37" cy="23" r="10.5" fill={fill('c')} />
    {gloss(33, 19, 2.4, 5.2, -35)}
  </Frame>

  return <Frame size={size} label={label}>
    <defs>{grad('white', 'a', [0, 0, 0, 1])}{grad('red', 'b', [0, 0, 0, 1])}</defs>
    {shadow}
    <rect x="9" y="12" width="46" height="42" rx="11" fill={fill('a')} />
    <path d="M9 24c0-8 4-12 11-12h24c7 0 11 4 11 12Z" fill={fill('b')} />
    <rect x="19" y="6" width="5" height="12" rx="2.5" fill="#8b5cf6" />
    <rect x="40" y="6" width="5" height="12" rx="2.5" fill="#8b5cf6" />
    <g fill="#b7bdc9"><rect x="17" y="32" width="8" height="7" rx="2" /><rect x="28" y="32" width="8" height="7" rx="2" /><rect x="39" y="32" width="8" height="7" rx="2" /><rect x="17" y="42" width="8" height="7" rx="2" /><rect x="28" y="42" width="8" height="7" rx="2" fill="#0a84ff" /></g>
  </Frame>
}
