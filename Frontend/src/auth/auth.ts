import { api, setToken } from '../api/client'

export type Role = 'participant' | 'organizer'

export interface Session {
  login: string
  role: Role
}

const KEY = 'algo-session'
export const SESSION_EVENT = 'algo-session-change'

export function getSessionRaw(): string | null {
  try {
    return localStorage.getItem(KEY)
  } catch {
    return null
  }
}

export function getSession(): Session | null {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as Session) : null
  } catch {
    return null
  }
}

export function saveSession(session: Session): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(session))
    window.dispatchEvent(new Event(SESSION_EVENT))
  } catch {
    /* ignore */
  }
}

export function clearSession(): void {
  setToken(null)
  try {
    localStorage.removeItem(KEY)
    window.dispatchEvent(new Event(SESSION_EVENT))
  } catch {
    /* ignore */
  }
}

/** POST /auth/login (form-urlencoded: username + password) → access_token. */
export async function loginRequest(email: string, password: string, wantOrganizer: boolean): Promise<void> {
  const res = await api<{ access_token: string }>('/auth/login', {
    method: 'POST',
    form: { username: email, password },
  })
  setToken(res.access_token)
  // В Swagger нет отдельной роли организатора, поэтому роль в UI — по выбору пользователя.
  saveSession({ login: email, role: wantOrganizer ? 'organizer' : 'participant' })
}

/** POST /auth/register/participant (только email + password), затем сразу логин. */
export async function registerRequest(email: string, password: string, wantOrganizer: boolean): Promise<void> {
  await api('/auth/register/participant', { method: 'POST', json: { email, password } })
  await loginRequest(email, password, wantOrganizer)
}

/** Куда вернуть пользователя после входа (например, на /join/<токен>, если он пришёл по ссылке). */
const AFTER_KEY = 'algo-after-login'
export const rememberAfterLogin = (path: string) => {
  try {
    sessionStorage.setItem(AFTER_KEY, path)
  } catch {
    /* ignore */
  }
}
export const takeAfterLogin = (): string | null => {
  try {
    const v = sessionStorage.getItem(AFTER_KEY)
    sessionStorage.removeItem(AFTER_KEY)
    return v
  } catch {
    return null
  }
}
