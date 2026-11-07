import { useMemo, useSyncExternalStore } from 'react'
import { SESSION_EVENT, getSessionRaw, type Session } from './auth'

function subscribe(cb: () => void) {
  window.addEventListener(SESSION_EVENT, cb)
  window.addEventListener('storage', cb)
  return () => {
    window.removeEventListener(SESSION_EVENT, cb)
    window.removeEventListener('storage', cb)
  }
}

/** Текущая сессия (или null). Компонент перерисуется при входе/выходе. */
export function useSession(): Session | null {
  const raw = useSyncExternalStore(subscribe, getSessionRaw, () => null)
  return useMemo(() => {
    try {
      return raw ? (JSON.parse(raw) as Session) : null
    } catch {
      return null
    }
  }, [raw])
}
