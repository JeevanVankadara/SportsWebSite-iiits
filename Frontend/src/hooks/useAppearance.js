import { useEffect, useState } from 'react'

const KEY = 'iiits-viewer-theme-choice'
export const instituteLogo = theme => theme === 'dark' ? '/iiits-logo-dark.png' : '/iiits-logo-transparent.png'

export function useAppearance() {
  const [stored, setStored] = useState(() => {
    try { const value = localStorage.getItem(KEY); return ['dark', 'light'].includes(value) ? value : null } catch { return null }
  })
  const [system, setSystem] = useState(() => window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
  useEffect(() => {
    const query = window.matchMedia('(prefers-color-scheme: dark)')
    const change = event => setSystem(event.matches ? 'dark' : 'light')
    query.addEventListener('change', change)
    return () => query.removeEventListener('change', change)
  }, [])
  const theme = stored ?? system
  useEffect(() => {
    const root = document.documentElement
    root.style.backgroundColor = theme === 'dark' ? '#000' : '#f5f5f7'
    root.style.colorScheme = theme
    const favicon = document.querySelector('link[rel="icon"]')
    if (favicon) favicon.href = `${instituteLogo(theme)}?v=3`
    const themeColor = document.querySelector('meta[name="theme-color"]')
    if (themeColor) themeColor.content = theme === 'dark' ? '#000000' : '#f5f5f7'
    return () => { root.style.backgroundColor = ''; root.style.colorScheme = '' }
  }, [theme])
  const changeTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    const override = next === system ? null : next
    setStored(override)
    try { if (override) localStorage.setItem(KEY, override); else localStorage.removeItem(KEY) } catch { /* Keep the choice in memory. */ }
  }
  return { theme, changeTheme }
}
