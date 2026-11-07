import { useEffect, useRef, useState, type FormEvent } from 'react'
import { DIFFICULTY_LABEL, MODE_LABEL, type Contest, type ContestMode, type Difficulty } from '../../types'
import { toHHmm } from '../../utils/format'
import './CreateContestForm.css'

export type NewContest = Omit<Contest, 'id' | 'creator'>

interface Props {
  /** Если передан — форма открыта для редактирования этого контеста (поля заполнены его данными). */
  initial?: Contest
  onSubmit: (contest: NewContest) => void | Promise<void>
  onCancel: () => void
}

interface TaskDraft {
  /** id нужен, чтобы при удалении «средней» задачи кружки и тексты не перемешивались */
  id: number
  description: string
  examples: string
}

const MAX_TASKS = 20

const emptyTask = (id: number): TaskDraft => ({ id, description: '', examples: '' })
const isTaskDone = (t: TaskDraft) => !!t.description.trim() && !!t.examples.trim()

export default function CreateContestForm({ initial, onSubmit, onCancel }: Props) {
  const isEdit = !!initial

  // ----- данные матча целиком -----
  const [title, setTitle] = useState(initial?.title ?? '')
  const [startsAt, setStartsAt] = useState(initial ? toHHmm(initial.startsAt) : '')
  const [endsAt, setEndsAt] = useState(initial ? toHHmm(initial.endsAt) : '')
  const [difficulty, setDifficulty] = useState<Difficulty | ''>(initial?.difficulty ?? '')
  const [mode, setMode] = useState<ContestMode | ''>(initial?.mode ?? '')

  // ----- задачи: у каждой своё описание и примеры -----
  const [tasks, setTasks] = useState<TaskDraft[]>(() => {
    if (!initial) return [emptyTask(1), emptyTask(2)]
    // у старых контестов без задач создаём одну из общего описания
    const src = initial.tasks?.length ? initial.tasks : [{ description: initial.description, examples: '' }]
    return src.map((t, i) => ({ id: i + 1, description: t.description, examples: t.examples }))
  })
  const [active, setActive] = useState(0)
  const nextTaskId = useRef(tasks.length + 1)

  const [error, setError] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const current = tasks[active]

  const patchTask = (patch: Partial<Omit<TaskDraft, 'id'>>) =>
    setTasks((list) => list.map((t, i) => (i === active ? { ...t, ...patch } : t)))

  const addTask = () => {
    if (tasks.length >= MAX_TASKS) return
    setTasks((list) => [...list, emptyTask(nextTaskId.current++)])
    setActive(tasks.length) // сразу переходим к новой задаче
  }

  const removeTask = (index: number) => {
    if (tasks.length <= 1) return // минимум одна задача
    setTasks((list) => list.filter((_, i) => i !== index))
    // выбранная задача остаётся той же, если удалили не её
    setActive((a) => (index < a ? a - 1 : Math.min(a, tasks.length - 2)))
  }

  // Escape — вернуться к списку
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onCancel()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onCancel])

  const missing = {
    title: !title.trim(),
    time: !startsAt || !endsAt || startsAt === endsAt,
    difficulty: !difficulty,
    mode: !mode,
  }
  const showInvalid = (k: keyof typeof missing) => submitted && missing[k]

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    setSubmitted(true)

    if (Object.values(missing).some(Boolean)) {
      setError(
        missing.time && startsAt && endsAt
          ? 'Время начала и конца не должны совпадать'
          : 'Заполните название, время, сложность и тип',
      )
      return
    }
    const firstBad = tasks.findIndex((t) => !isTaskDone(t))
    if (firstBad !== -1) {
      setActive(firstBad)
      setError(`Заполните описание и примеры для задачи ${firstBad + 1}`)
      return
    }

    setError('')
    onSubmit({
      title: title.trim(),
      mode: mode as ContestMode,
      difficulty: difficulty as Difficulty,
      startsAt,
      endsAt,
      // для карточки в списке показываем описание первой задачи
      description: tasks[0].description.trim(),
      tasks: tasks.map((t) => ({ description: t.description.trim(), examples: t.examples.trim() })),
    })
  }

  return (
    <form className="create" onSubmit={handleSubmit} noValidate>
      <div className="create__side">
        <input
          className="create__field"
          type="text"
          placeholder="название"
          aria-label="Название"
          aria-invalid={showInvalid('title')}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        {/* время начала и конца задаёт сам создатель, например с 18:00 до 21:00 */}
        <div className="create__field create__time" role="group" aria-label="Время" aria-invalid={showInvalid('time')}>
          <span className="create__time-label">с</span>
          <input
            className="create__time-input"
            type="time"
            aria-label="Время начала"
            value={startsAt}
            onChange={(e) => setStartsAt(e.target.value)}
          />
          <span className="create__time-label">до</span>
          <input
            className="create__time-input"
            type="time"
            aria-label="Время окончания"
            value={endsAt}
            onChange={(e) => setEndsAt(e.target.value)}
          />
        </div>

        <select
          className="create__field create__select"
          aria-label="Сложность"
          aria-invalid={showInvalid('difficulty')}
          data-empty={difficulty === ''}
          value={difficulty}
          onChange={(e) => setDifficulty(e.target.value as Difficulty)}
        >
          <option value="" disabled hidden>
            сложность
          </option>
          {(Object.keys(DIFFICULTY_LABEL) as Difficulty[]).map((k) => (
            <option key={k} value={k}>
              {DIFFICULTY_LABEL[k]}
            </option>
          ))}
        </select>

        <select
          className="create__field create__select"
          aria-label="Тип"
          aria-invalid={showInvalid('mode')}
          data-empty={mode === ''}
          value={mode}
          onChange={(e) => setMode(e.target.value as ContestMode)}
        >
          <option value="" disabled hidden>
            тип
          </option>
          {(Object.keys(MODE_LABEL) as ContestMode[]).map((k) => (
            <option key={k} value={k}>
              {MODE_LABEL[k]}
            </option>
          ))}
        </select>

        {/* кружки задач: нажатие выбирает задачу, минус при наведении убирает её */}
        <div className="create__tasks" role="group" aria-label="Задачи">
          {tasks.map((t, i) => (
            <span key={t.id} className="create__task">
              <button
                type="button"
                className={`create__circle${i === active ? ' create__circle--active' : ''}`}
                aria-current={i === active || undefined}
                aria-invalid={submitted && !isTaskDone(t)}
                aria-label={`Задача ${i + 1}`}
                onClick={() => setActive(i)}
              >
                {i + 1}
              </button>
              {tasks.length > 1 && (
                <button
                  type="button"
                  className="create__minus"
                  aria-label={`Убрать задачу ${i + 1}`}
                  title="Убрать"
                  onClick={() => removeTask(i)}
                >
                  <svg viewBox="0 0 10 10" width="8" height="8" aria-hidden="true">
                    <path d="M1.5 5h7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                </button>
              )}
            </span>
          ))}
          {tasks.length < MAX_TASKS && (
            <button
              type="button"
              className="create__circle create__circle--add"
              aria-label="Добавить задачу"
              onClick={addTask}
            >
              +
            </button>
          )}
        </div>

        <div className="create__actions">
          <p className="create__error" role="alert">
            {error}
          </p>
          <button type="submit" className="create__submit">
            {isEdit ? 'Сохранить' : 'Создать'}
          </button>
          <button type="button" className="create__cancel" onClick={onCancel}>
            Отмена
          </button>
        </div>
      </div>

      {/* справа — описание и примеры выбранной задачи */}
      <div className="create__main">
        <label className="create__label" htmlFor="create-desc">
          Описание <span className="create__label-sub">задача {active + 1}</span>
        </label>
        <textarea
          id="create-desc"
          className="create__area"
          aria-invalid={submitted && !current.description.trim()}
          value={current.description}
          onChange={(e) => patchTask({ description: e.target.value })}
        />

        <label className="create__label" htmlFor="create-examples">
          Примеры <span className="create__label-sub">задача {active + 1}</span>
        </label>
        <textarea
          id="create-examples"
          className="create__area"
          placeholder={'Вход: 3 5\nВыход: 8\n\n(несколько примеров разделяйте пустой строкой)'}
          aria-invalid={submitted && !current.examples.trim()}
          value={current.examples}
          onChange={(e) => patchTask({ examples: e.target.value })}
        />
      </div>
    </form>
  )
}
