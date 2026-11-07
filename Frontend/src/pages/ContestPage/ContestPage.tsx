import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import Header from '../../components/Header/Header'
import Footer from '../../components/Footer/Footer'
import { fetchContests, submitCode } from '../../api/contests'
import { getMyUserId } from '../../api/client'
import { openMatchSocket } from '../../api/match'
import { useSession } from '../../auth/useSession'
import { DIFFICULTY_LABEL, type Contest } from '../../types'
import { durationMinutes, formatClock } from '../../utils/format'
import './ContestPage.css'

type TaskStatus = 'idle' | 'ok' | 'fail'

const LANGUAGES = ['Python', 'JavaScript', 'TypeScript', 'C++', 'Java']
const DEFAULT_TASKS = 3

const OPP_LABEL: Record<string, string> = { testing: 'проверяется…', success: 'решил задачу', failed: 'ошибка' }
const OK = ['ok', 'accepted', 'success']
const FAIL = ['fail', 'failed', 'wa', 'wrong_answer', 'error', 'rejected']

const STATUS_LABEL: Record<TaskStatus, string> = {
  idle: 'не решена',
  ok: 'решена',
  fail: 'неверное решение',
}

/** Примеры: блоки через пустую строку → «Пример 1», «Пример 2» … */
function splitExamples(text?: string): string[] {
  return (text ?? '')
    .split(/\n\s*\n/)
    .map((b) => b.trim())
    .filter(Boolean)
}

export default function ContestPage() {
  const { id } = useParams()
  const [search] = useSearchParams()
  const navigate = useNavigate()
  const session = useSession()

  const [contest, setContest] = useState<Contest | null>(null)
  const [loading, setLoading] = useState(true)

  const [active, setActive] = useState(0)
  const [language, setLanguage] = useState(LANGUAGES[0])
  // код хранится отдельно для каждой задачи
  const [codes, setCodes] = useState<Record<number, string>>({})
  const [statuses, setStatuses] = useState<Record<number, TaskStatus>>({})
  const [secondsLeft, setSecondsLeft] = useState(0)

  useEffect(() => {
    const ctrl = new AbortController()
    fetchContests(ctrl.signal)
      .then((list) => {
        const found = list.find((c) => c.id === id) ?? null
        setContest(found)
        if (found) setSecondsLeft(durationMinutes(found) * 60)
      })
      .catch((err: Error) => {
        if (err.name !== 'AbortError') console.error(err)
      })
      .finally(() => setLoading(false))
    return () => ctrl.abort()
  }, [id])

  const room = search.get('room')
  const [testing, setTesting] = useState(false)
  const [opponent, setOpponent] = useState('')
  const [checkError, setCheckError] = useState('')
  const pendingTask = useRef<number | null>(null)

  // сокет матча: вердикты по своим решениям и прогресс соперника
  useEffect(() => {
    if (!room) return
    const me = getMyUserId()
    return openMatchSocket(Number(room), (msg) => {
      if (msg.event !== 'submission_update') return
      const st = String(msg.status ?? '').toLowerCase()
      if (me != null && Number(msg.user_id) === me) {
        const idx = pendingTask.current
        if (idx == null) return
        if (OK.includes(st)) setStatuses((s) => ({ ...s, [idx]: 'ok' }))
        else if (FAIL.includes(st)) setStatuses((s) => ({ ...s, [idx]: 'fail' }))
        else return // testing — ждём итог
        pendingTask.current = null
        setTesting(false)
      } else {
        setOpponent(OPP_LABEL[st] ?? st)
      }
    })
  }, [room])

  // ЗАГЛУШКА таймера: считаем от полной длительности с момента открытия страницы.
  // TODO: брать оставшееся время с бэкенда (endsAt - серверное «сейчас»).
  const finished = secondsLeft <= 0
  const timeIsUp = !!contest && finished
  useEffect(() => {
    if (!contest || finished) return
    const t = window.setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000)
    return () => window.clearInterval(t)
  }, [contest, finished])

  const tasksCount = contest?.tasks?.length || DEFAULT_TASKS
  // условие и примеры — из активной задачи (если создатель их не задал, показываем общее описание)
  const task = contest?.tasks?.[active]
  const examples = useMemo(() => splitExamples(task?.examples), [task])

  if (!session) return <Navigate to="/login" replace />

  const code = codes[active] ?? ''

  const onEditorKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Tab вставляет отступ, а не уводит фокус
    if (e.key !== 'Tab') return
    e.preventDefault()
    const el = e.currentTarget
    const { selectionStart: a, selectionEnd: b } = el
    const next = code.slice(0, a) + '    ' + code.slice(b)
    setCodes((c) => ({ ...c, [active]: next }))
    requestAnimationFrame(() => el.setSelectionRange(a + 4, a + 4))
  }

  const check = async () => {
    if (!code.trim() || timeIsUp || testing) return
    const taskId = task?.id
    if (taskId == null) {
      setCheckError('У задачи нет id с бэкенда')
      return
    }
    setCheckError('')
    setTesting(true)
    pendingTask.current = active
    try {
      // match_id — id матча из /lobby (?room=...)
      const res = await submitCode(Number(room ?? id), taskId, code, language)
      const verdict = String(res.verdict ?? res.status ?? '').toLowerCase()
      if (OK.includes(verdict) || FAIL.includes(verdict)) {
        setStatuses((s) => ({ ...s, [active]: OK.includes(verdict) ? 'ok' : 'fail' }))
        pendingTask.current = null
        setTesting(false)
      } else if (!room) {
        setTesting(false)
      } // иначе итог придёт событием по сокету
    } catch (err) {
      setCheckError((err as Error).message)
      pendingTask.current = null
      setTesting(false)
    }
  }

  return (
    <div className="arena">
      <Header />

      <main className="arena__main">
        {loading ? (
          <p className="arena__state">Загрузка…</p>
        ) : !contest ? (
          <div className="arena__state">
            <p>Контест не найден</p>
            <button type="button" className="btn" onClick={() => navigate('/')}>
              К списку контестов
            </button>
          </div>
        ) : (
          <>
            <div className="arena__top">
              <h1 className="arena__title">{contest.title}</h1>

              <div className="arena__tasks" role="group" aria-label="Задачи">
                {Array.from({ length: tasksCount }, (_, i) => {
                  const st = statuses[i] ?? 'idle'
                  return (
                    <button
                      key={i}
                      type="button"
                      className={`arena__task arena__task--${st}${i === active ? ' arena__task--active' : ''}`}
                      aria-current={i === active || undefined}
                      aria-label={`Задача ${i + 1}: ${STATUS_LABEL[st]}`}
                      onClick={() => setActive(i)}
                    >
                      {i + 1}
                    </button>
                  )
                })}
              </div>

              {opponent && <span className="arena__text">соперник: {opponent}</span>}
              <span className={`arena__timer${timeIsUp ? ' arena__timer--over' : ''}`} aria-label="Осталось времени">
                {formatClock(secondsLeft)}
              </span>
            </div>

            <div className="arena__grid">
              <div className="arena__info">
                <section className="arena__panel arena__panel--desc">
                  <h2 className="arena__panel-title">Сложность: {DIFFICULTY_LABEL[contest.difficulty]}</h2>
                  <p className="arena__text">{task?.description || contest.description}</p>
                </section>

                <section className="arena__panel arena__panel--examples">
                  {examples.length === 0 ? (
                    <p className="arena__text">Примеры не указаны</p>
                  ) : (
                    examples.map((ex, i) => (
                      <div key={i} className="arena__example">
                        <h3 className="arena__example-title">Пример {i + 1}</h3>
                        <pre className="arena__example-body">{ex}</pre>
                      </div>
                    ))
                  )}
                </section>
              </div>

              <div className="arena__editor">
                <select
                  className="arena__lang"
                  aria-label="Язык программирования"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                >
                  {LANGUAGES.map((l) => (
                    <option key={l} value={l}>
                      {l}
                    </option>
                  ))}
                </select>

                <textarea
                  className="arena__code"
                  aria-label={`Код решения, задача ${active + 1}`}
                  spellCheck={false}
                  autoCapitalize="off"
                  autoCorrect="off"
                  value={code}
                  onChange={(e) => setCodes((c) => ({ ...c, [active]: e.target.value }))}
                  onKeyDown={onEditorKey}
                />

                <button type="button" className="arena__check" onClick={check} disabled={!code.trim() || timeIsUp || testing}>
                  {testing ? 'проверяется…' : 'проверить'}
                </button>
                {checkError && <p className="arena__text" role="alert">{checkError}</p>}
              </div>
            </div>
          </>
        )}
      </main>

      <Footer />
    </div>
  )
}
