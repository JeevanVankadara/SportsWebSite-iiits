import { useEffect, useRef, useState } from 'react'
import { RotateCcw } from 'lucide-react'
import { Player } from '@remotion/player'
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion'
import { Portrait } from './PlayerAvatar.jsx'
function PortraitEntrance({ seed, team }) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const progress = spring({ frame, fps, config: { damping: 22, stiffness: 160 } })
  return <div style={{ width: '100%', height: '100%', opacity: interpolate(frame, [0, 8], [0.85, 1], { extrapolateRight: 'clamp' }), transform: `translateY(${(1 - progress) * 12}px) scale(${0.96 + progress * 0.04})` }}><Portrait seed={seed} team={team} className="st-motion-image" /></div>
}
export default function PlayerPortraitMotion({ seed, team, className }) {
  const player = useRef(null)
  const [reduced, setReduced] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReduced(query.matches)
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])
  if (reduced) return <Portrait seed={seed} team={team} className={className} />
  return <div className="st-animated-avatar"><div className={`st-portrait-motion ${className}`} aria-hidden="true"><Player ref={player} component={PortraitEntrance} inputProps={{ seed, team }} durationInFrames={36} fps={30} compositionWidth={160} compositionHeight={160} autoPlay muted controls={false} clickToPlay={false} style={{ width: '100%', height: '100%' }} /></div><button type="button" className="st-avatar-replay" aria-label="Replay player animation" onClick={() => { player.current?.seekTo(0); player.current?.play() }}><RotateCcw size={18} /></button></div>
}
