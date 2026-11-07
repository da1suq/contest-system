/**
 * Базовый клиент для реального API (Contest system API, FastAPI).
 * VITE_API_URL: в dev — "/api" (проксируется через vite.config.ts, без CORS),
 * в проде — полный адрес бэкенда.
 */
const BASE = ((import.meta.env.VITE_API_URL as string | undefined) ?? '').replace(/\/$/, '')

const TOKEN_KEY = 'algo-token'

export const getToken = (): string | null => {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}
export const setToken = (t: string | null) => {
  try {
    if (t) localStorage.setItem(TOKEN_KEY, t)
    else localStorage.removeItem(TOKEN_KEY)
  } catch {
    /* ignore */
  }
}

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

/** FastAPI отдаёт detail строкой (HTTPException) или массивом (422 валидация). */
function extractMessage(body: unknown, fallback: string): string {
  const detail = (body as { detail?: unknown } | null)?.detail
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail)) {
    return detail.map((d) => (d as { msg?: string }).msg ?? '').filter(Boolean).join('; ') || fallback
  }
  return fallback
}

interface Options {
  method?: 'GET' | 'POST'
  /** JSON-тело */
  json?: unknown
  /** application/x-www-form-urlencoded (нужно для /auth/login) */
  form?: Record<string, string>
  signal?: AbortSignal
}

export async function api<T = unknown>(path: string, opts: Options = {}): Promise<T> {
  const headers: Record<string, string> = {}
  let body: BodyInit | undefined
  if (opts.json !== undefined) {
    headers['Content-Type'] = 'application/json'
    body = JSON.stringify(opts.json)
  } else if (opts.form) {
    headers['Content-Type'] = 'application/x-www-form-urlencoded'
    body = new URLSearchParams(opts.form)
  }
  const token = getToken()
  // OAuth2PasswordBearer для защищённых ручек; /rooms* читает заголовок authorization (тот же формат)
  if (token) headers['Authorization'] = `Bearer ${token}`

  let res: Response
  try {
    res = await fetch(`${BASE}${path}`, { method: opts.method ?? 'GET', headers, body, signal: opts.signal })
  } catch (e) {
    if ((e as Error).name === 'AbortError') throw e
    throw new ApiError(0, 'Нет связи с сервером')
  }

  const text = await res.text()
  let data: unknown = null
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    data = text
  }
  if (!res.ok) throw new ApiError(res.status, extractMessage(data, `Ошибка ${res.status}`))
  return data as T
}

/** id текущего пользователя из поля sub в JWT (если токен его содержит). */
export function getMyUserId(): number | null {
  const t = getToken()
  if (!t) return null
  try {
    const payload = JSON.parse(atob(t.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
    const n = Number(payload.sub ?? payload.user_id ?? payload.id)
    return Number.isFinite(n) ? n : null
  } catch {
    return null
  }
}
