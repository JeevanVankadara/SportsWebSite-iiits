import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { Moon, Sun } from 'lucide-react'

export default function ThemeToggle({ theme, onChange }) {
  const control = useRef(null)
  const thumb = useRef(null)

  useEffect(() => {
    const button = control.current
    const indicator = thumb.current
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
    const position = (animate = false) => {
      const inset = Number.parseFloat(getComputedStyle(indicator).left) || 0
      const distance = Math.max(0, button.clientWidth - indicator.offsetWidth - inset * 2)
      gsap.to(indicator, {
        x: button.getAttribute('aria-pressed') === 'true' ? distance : 0,
        duration: animate && !reducedMotion.matches ? 0.35 : 0,
        ease: 'power3.out',
        overwrite: true,
      })
    }
    position()
    const stateObserver = new MutationObserver(() => position(true))
    stateObserver.observe(button, { attributes: true, attributeFilter: ['aria-pressed'] })
    const sizeObserver = new ResizeObserver(() => position())
    sizeObserver.observe(button)
    const onMotionChange = () => position()
    reducedMotion.addEventListener('change', onMotionChange)
    return () => {
      stateObserver.disconnect()
      sizeObserver.disconnect()
      reducedMotion.removeEventListener('change', onMotionChange)
      gsap.killTweensOf(indicator)
    }
  }, [])

  return (
    <button
      ref={control}
      type="button"
      className="st-theme-toggle"
      aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
      aria-pressed={theme === 'dark'}
      onClick={onChange}
    >
      <span ref={thumb} className="st-theme-thumb" aria-hidden="true" />
      <Sun size={16} aria-hidden="true" />
      <Moon size={16} aria-hidden="true" />
    </button>
  )
}
