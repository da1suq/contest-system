import type { Contest } from '../types'

const pad = (n: number) => String(n).padStart(2, '0')

/** Принимает "HH:mm" или ISO-строку, возвращает "HH:mm". */
export function toHHmm(value: string): string {
  if (/^\d{1,2}:\d{2}$/.test(value)) return value
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function formatTimeRange(c: Pick<Contest, 'startsAt' | 'endsAt'>): string {
  return `${toHHmm(c.startsAt)} - ${toHHmm(c.endsAt)}`
}

export const formatStart = (c: Pick<Contest, 'startsAt'>): string => toHHmm(c.startsAt)

const HHMM = /^(\d{1,2}):(\d{2})$/

function plural(n: number, forms: [string, string, string]): string {
  const m10 = n % 10
  const m100 = n % 100
  if (m10 === 1 && m100 !== 11) return forms[0]
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return forms[1]
  return forms[2]
}

/** Длительность контеста в минутах (0, если не удалось вычислить). */
export function durationMinutes(c: Pick<Contest, 'startsAt' | 'endsAt'>): number {
  const a = HHMM.exec(c.startsAt)
  const b = HHMM.exec(c.endsAt)
  let minutes: number
  if (a && b) {
    minutes = (Number(b[1]) * 60 + Number(b[2])) - (Number(a[1]) * 60 + Number(a[2]))
    if (minutes < 0) minutes += 24 * 60 // контест через полночь
  } else {
    minutes = Math.round((new Date(c.endsAt).getTime() - new Date(c.startsAt).getTime()) / 60000)
  }
  return Number.isFinite(minutes) && minutes > 0 ? minutes : 0
}

/** Длительность: «2 часа», «1 час», «1 ч 30 мин», «45 мин». */
export function formatDuration(c: Pick<Contest, 'startsAt' | 'endsAt'>): string {
  const minutes = durationMinutes(c)
  if (!minutes) return ''
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m} мин`
  if (m === 0) return `${h} ${plural(h, ['час', 'часа', 'часов'])}`
  return `${h} ч ${m} мин`
}

/** Таймер: «1:11:05» (если есть часы) или «11:05». */
export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`
}
