import { useEffect } from 'react'
import gsap from 'gsap'
export function useViewerMotion(root, route) {
  useEffect(() => {
    const element = root.current
    if (!element) return
    const media = gsap.matchMedia()
    const indicators = new Map()
    const placeIndicators = () => {
      element.querySelectorAll('.st-filter-bar,.st-content-tabs').forEach(group => {
        let indicator = indicators.get(group)
        if (!indicator) {
          indicator = document.createElement('span')
          indicator.className = 'st-sliding-indicator'
          indicator.setAttribute('aria-hidden', 'true')
          group.prepend(indicator)
          group.classList.add('st-motion-controls')
          indicators.set(group, indicator)
        }
        const selected = group.querySelector('button[aria-pressed="true"],button[aria-selected="true"]')
        if (!selected) return
        const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
        gsap.to(indicator, { x: selected.offsetLeft, y: selected.offsetTop, width: selected.offsetWidth, height: selected.offsetHeight, duration: reduce ? 0 : .38, ease: 'power3.out', overwrite: true })
      })
    }
    placeIndicators()
    const observer = new MutationObserver(placeIndicators)
    observer.observe(element, { childList: true, subtree: true, attributes: true, attributeFilter: ['aria-selected', 'aria-pressed'] })
    const resize = new ResizeObserver(placeIndicators)
    resize.observe(element)
    media.add('(prefers-reduced-motion: no-preference)', () => {
      const ambient = gsap.timeline({ repeat: -1, yoyo: true }).to(element.querySelectorAll('.st-ambient span'), { x: 48, y: -32, scale: 1.08, duration: 14, stagger: 2, ease: 'sine.inOut' }).to(element, { '--st-flow-x': '24px', duration: 14, ease: 'sine.inOut' }, 0)
      const pause = () => document.hidden ? ambient.pause() : ambient.resume()
      document.addEventListener('visibilitychange', pause)
      const hover = event => {
        const card = event.target.closest('.st-match-card,.st-player-card,.st-home-player')
        if (card && !card.contains(event.relatedTarget) && window.matchMedia('(hover: hover)').matches) gsap.to(card, { y: -3, duration: .28, ease: 'power2.out', overwrite: true })
        const icon = event.target.closest('a,button')?.querySelector('svg')
        if (icon && !icon.closest('.st-theme-toggle')) gsap.to(icon, { x: 2, duration: .24, overwrite: true })
      }
      const leave = event => {
        const card = event.target.closest('.st-match-card,.st-player-card,.st-home-player')
        if (card && !card.contains(event.relatedTarget)) gsap.to(card, { y: 0, duration: .3, overwrite: true })
        const icon = event.target.closest('a,button')?.querySelector('svg')
        if (icon && !icon.closest('.st-theme-toggle')) gsap.to(icon, { x: 0, duration: .24, overwrite: true })
      }
      element.addEventListener('pointerover', hover)
      element.addEventListener('pointerout', leave)
      return () => { document.removeEventListener('visibilitychange', pause); element.removeEventListener('pointerover', hover); element.removeEventListener('pointerout', leave); gsap.killTweensOf(element.querySelectorAll('.st-match-card,.st-player-card,.st-home-player,svg')) }
    })
    return () => { observer.disconnect(); resize.disconnect(); media.revert(); indicators.forEach((indicator, group) => { gsap.killTweensOf(indicator); indicator.remove(); group.classList.remove('st-motion-controls') }) }
  }, [root, route])
}
