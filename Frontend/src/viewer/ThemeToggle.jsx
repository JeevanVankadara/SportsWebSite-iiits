import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { Moon, Sun } from 'lucide-react'
export default function ThemeToggle({ theme, onChange }) {
  const thumb = useRef(null)
  useEffect(() => {
    const context = gsap.context(() => gsap.to(thumb.current, { x: theme === 'dark' ? 32 : 0, rotation: theme === 'dark' ? 180 : 0, duration: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : .8, ease: 'elastic.out(1, .65)' }))
    return () => context.revert()
  }, [theme])
  return <button className="st-theme-toggle" aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'} aria-pressed={theme === 'dark'} onClick={onChange}><span ref={thumb} className="st-theme-thumb" /><Sun size={16} /><Moon size={16} /></button>
}
