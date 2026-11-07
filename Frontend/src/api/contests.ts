import type { Contest, ContestTask } from '../types'
import { api } from './client'
import { durationMinutes } from '../utils/format'

/** В API у задачи нет поля «примеры» — храним их в statement после этого маркера. */
const EX_MARK = '\n\nПримеры:\n'

/* ---------- маппинг ответов бэкенда (схемы ответов в Swagger пустые — читаем защитно) ---------- */
type Raw = Record<string, unknown>
const str = (v: unknown, d = '') => (typeof v === 'string' ? v : v == null ? d : String(v))

function mapTask(t: Raw): ContestTask {
  // бэкенд отдаёт description, example_input, example_output (старые поля statement/examples — как запасной вариант)
  const raw = str(t.description ?? t.statement)
  const i = raw.indexOf(EX_MARK)
  const inp = str(t.example_input)
  const out = str(t.example_output)
  const fromFields = inp || out ? `Вход: ${inp}\nВыход: ${out}` : ''
  return {
    id: t.id as number | undefined,
    description: i === -1 ? raw : raw.slice(0, i),
    examples: fromFields || (i === -1 ? str(t.examples) : raw.slice(i + EX_MARK.length)),
  }
}

function mapContest(c: Raw, tasks: ContestTask[]): Contest {
  const start = str(c.start_at ?? c.startsAt)
  const minutes = Number(c.duration_minutes ?? 0)
  const end = start && minutes ? new Date(new Date(start).getTime() + minutes * 60000).toISOString() : str(c.endsAt, start)
  const mode = c.mode === 'team' ? 'team' : 'duel'
  return {
    id: String(c.id),
    title: str(c.title),
    mode,
    startsAt: start,
    endsAt: end,
    // в API нет сложности — пока константа
    difficulty: 'medium',
    description: str(c.description),
    tasks,
    creator: c.creator ? str(c.creator) : undefined,
  }
}

export async function fetchTasks(contestId: string, signal?: AbortSignal): Promise<ContestTask[]> {
  const raw = await api<Raw[]>(`/contests/${contestId}/tasks`, { signal })
  return (Array.isArray(raw) ? raw : []).map(mapTask)
}

/** GET /contests/ + задачи каждого контеста. */
export async function fetchContests(signal?: AbortSignal): Promise<Contest[]> {
  const raw = await api<Raw[]>('/contests/', { signal })
  const list = Array.isArray(raw) ? raw : []
  return Promise.all(
    list.map(async (c) => {
      const tasks = await fetchTasks(String(c.id), signal).catch((e) => {
        if ((e as Error).name === 'AbortError') throw e
        return []
      })
      return mapContest(c, tasks)
    }),
  )
}

/** "HH:mm" → ISO сегодняшней даты в локальном времени. */
function toIsoToday(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number)
  const d = new Date()
  d.setHours(h, m, 0, 0)
  return d.toISOString()
}

/** POST /contests/ и POST /contests/{id}/tasks для каждой задачи. */
export async function createContest(data: Omit<Contest, 'id' | 'creator'>): Promise<Contest> {
  const created = await api<Raw>('/contests/', {
    method: 'POST',
    json: {
      title: data.title,
      description: data.description,
      mode: data.mode,
      start_at: toIsoToday(data.startsAt),
      duration_minutes: durationMinutes(data),
    },
  })
  const id = String(created.id)
  const tasks = data.tasks ?? []
  for (let i = 0; i < tasks.length; i++) {
    const t = tasks[i]
    await api(`/contests/${id}/tasks`, {
      method: 'POST',
      json: {
        title: `Задача ${i + 1}`,
        statement: t.examples ? `${t.description}${EX_MARK}${t.examples}` : t.description,
        time_limit: 1000, // мс — уточнить у бэкендеров единицы
        memory_limit: 256, // МБ — уточнить
        order: i + 1,
      },
    })
  }
  return mapContest({ ...created, ...data, id }, tasks)
}

const LANG_CODE: Record<string, string> = {
  Python: 'python',
  JavaScript: 'javascript',
  TypeScript: 'typescript',
  'C++': 'cpp',
  Java: 'java',
}

/** POST /submissions/submit. match_id — id матча из /lobby, task_id — id задачи. */
export function submitCode(matchId: number, taskId: number, code: string, language: string) {
  return api<Record<string, unknown>>('/submissions/submit', {
    method: 'POST',
    json: { match_id: matchId, task_id: taskId, code, language: LANG_CODE[language] ?? language.toLowerCase() },
  })
}
