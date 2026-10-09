import { useEffect, useState } from 'react'
import App from './App.tsx'
import { Landing } from './Landing.tsx'

type Route = 'landing' | 'desk'

function routeFromHash(): Route {
  return window.location.hash.replace(/^#\/?/, '').startsWith('desk')
    ? 'desk'
    : 'landing'
}

/**
 * Minimal hash router — no dependency.
 *   #/        → public landing page
 *   #/desk    → credit officer console
 */
export function Root() {
  const [route, setRoute] = useState<Route>(routeFromHash)

  useEffect(() => {
    const onHash = () => {
      const hash = window.location.hash
      // Route hashes look like "#/…"; anything else is an in-page anchor
      // (e.g. "#features") and should scroll to that section, not reset.
      if (hash.startsWith('#/')) {
        setRoute(routeFromHash())
        window.scrollTo(0, 0)
        return
      }
      const id = hash.replace(/^#/, '')
      const el = id ? document.getElementById(id) : null
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  return route === 'desk' ? <App /> : <Landing />
}
