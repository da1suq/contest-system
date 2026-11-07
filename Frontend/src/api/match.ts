import { getToken } from './client'

type Msg = Record<string, unknown>

/** ws://host/ws/match/{id}?token=... — токен только в query, заголовки у браузерного WebSocket недоступны. */
function wsBase(): string {
  const base = ((import.meta.env.VITE_API_URL as string | undefined) ?? '').replace(/\/$/, '')
  if (/^https?:/.test(base)) return base.replace(/^http/, 'ws')
  return `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}${base}`
}

/**
 * Подключение к сокету матча. Возвращает функцию закрытия (для cleanup в useEffect).
 * Бэкенд шлёт JSON: { event: 'submission_update', user_id, status: 'testing' | 'success' | 'failed' }.
 */
export function openMatchSocket(
  matchId: number,
  onMessage: (msg: Msg) => void,
  onClose?: () => void,
): () => void {
  const ws = new WebSocket(`${wsBase()}/ws/match/${matchId}?token=${encodeURIComponent(getToken() ?? '')}`)
  let closedByUs = false
  ws.onmessage = (e) => {
    try {
      const data = JSON.parse(String(e.data))
      if (data && typeof data === 'object') onMessage(data as Msg)
    } catch {
      /* не JSON — игнорируем */
    }
  }
  ws.onclose = () => {
    if (!closedByUs) onClose?.()
  }
  return () => {
    closedByUs = true
    ws.close()
  }
}

/**
 * Событие «соперник зашёл / матч начался».
 * TODO: бэкенд не назвал точное имя события старта — пока ловим любое, где есть start/join/ready/begin.
 */
export function isStartEvent(msg: Msg): boolean {
  const ev = String(msg.event ?? '').toLowerCase()
  return ev !== 'submission_update' && /start|join|ready|begin/.test(ev)
}
