import { lazy, Suspense } from 'react'
import { CartoonAvatar } from './Cartoon.jsx'
const AnimatedPortrait = lazy(() => import('./PlayerPortraitMotion.jsx'))
export function Portrait({ variant = 0, seed, team, className = '' }) {
  return <span aria-hidden="true" className={`st-portrait ${className}`}><CartoonAvatar seed={seed ?? `variant-${variant}`} team={team} /></span>
}
export default function PlayerAvatar({ id, team, animated = false, className = '' }) {
  const portrait = <Portrait seed={id} team={team} className={className} />
  return animated ? <Suspense fallback={portrait}><AnimatedPortrait seed={id} team={team} className={className} /></Suspense> : portrait
}
