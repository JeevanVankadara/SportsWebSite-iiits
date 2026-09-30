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
    return () => { observer.disconnect(); resize.disconnect(); media.revert(); indicators.forEach((indicator, group) => { gsap.killTweensOf(indicator); indicator.remove(); group.classList.remove('st-motion-controls') }) }
  }, [root, route])
}
