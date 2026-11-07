import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import Header from '../../components/Header/Header'
import Footer from '../../components/Footer/Footer'
import SearchBar from '../../components/SearchBar/SearchBar'
import ContestCarousel from '../../components/ContestCarousel/ContestCarousel'
import CreateContestForm, { type NewContest } from '../../components/CreateContestForm/CreateContestForm'
import { createContest, fetchContests } from '../../api/contests'
import { useSession } from '../../auth/useSession'
import { DIFFICULTY_LABEL, MODE_LABEL, type Contest } from '../../types'
import './HomePage.css'

/**
 * Плавно схлопывает/раскрывает блок (высота через grid-template-rows).
 * Уходящий блок сначала растворяется, потом схлопывается;
 * появляющийся ждёт, пока предыдущий уйдёт, раскрывается и проявляется.
 */
function Collapse({
  open,
  className,
  children,
}: {
  open: boolean
  className?: string
  children: ReactNode
}) {
  return (
    <div
      className={`collapse${open ? ' collapse--open' : ''} ${className ?? ''}`}
      aria-hidden={!open || undefined}
    >
      <div className="collapse__inner">{children}</div>
    </div>
  )
}

export default function HomePage() {
  const [contests, setContests] = useState<Contest[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const navigate = useNavigate()
  const session = useSession()
  const isOrganizer = session?.role === 'organizer'

  // creating — открыта форма создания (плавно подменяет список ячеек)
  const [creating, setCreating] = useState(false)
  const [formKey, setFormKey] = useState(0)
  // контест, который сейчас редактируется (null — создаётся новый)
  const [editing, setEditing] = useState<Contest | null>(null)

  const openForm = (contest: Contest | null) => {
    setEditing(contest)
    setFormKey((k) => k + 1) // каждый раз форма с актуальными данными
    setCreating(true)
  }
  const openCreate = () => openForm(null)
  const closeCreate = useCallback(() => setCreating(false), [])

  const [saveError, setSaveError] = useState('')
  const saveContest = async (data: NewContest) => {
    setSaveError('')
    if (editing) {
      // В Swagger нет PATCH /contests — редактирование пока только локально
      setContests((prev) => prev.map((c) => (c.id === editing.id ? { ...c, ...data } : c)))
    } else {
      try {
        const created = await createContest(data)
        setContests((prev) => [{ ...created, creator: session?.login }, ...prev])
      } catch (err) {
        setSaveError((err as Error).message || 'Не удалось создать контест')
        return
      }
    }
    setQuery('')
    setCreating(false)
  }

  useEffect(() => {
    const ctrl = new AbortController()
    fetchContests(ctrl.signal)
      .then(setContests)
      .catch((err: Error) => {
        if (err.name !== 'AbortError') console.error(err)
      })
      .finally(() => setLoading(false))
    return () => ctrl.abort()
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return contests
    return contests.filter((c) =>
      [c.title, MODE_LABEL[c.mode], DIFFICULTY_LABEL[c.difficulty], c.description]
        .join(' ')
        .toLowerCase()
        .includes(q),
    )
  }, [contests, query])

  return (
    <div className="home">
      <Header />
      <main className="home__main">
        <h1 key={creating ? 'create' : 'list'} className="home__title home__title--swap">
          {creating ? (editing ? 'Редактирование контеста' : 'Создание контеста') : isOrganizer ? 'Ваши контесты' : 'Список тем'}
        </h1>

        {/* подзаголовок и поиск плавно схлопываются, когда открыта форма */}
        <Collapse open={!creating} className="home__intro">
          <p className="home__subtitle">Выберите контест или воспользуйтесь поиском</p>
          <SearchBar value={query} onChange={setQuery} />
        </Collapse>

        <section className="home__list" aria-live="polite">
          <Collapse open={!creating} className="home__pane">
            {loading ? (
              <p className="home__state">Загрузка…</p>
            ) : filtered.length === 0 && !isOrganizer ? (
              <p className="home__state">Ничего не найдено</p>
            ) : (
              <ContestCarousel
                contests={filtered}
                role={session?.role}
                onAdd={isOrganizer ? openCreate : undefined}
                onEnter={(c) => {
                  // гость: кнопка «Войти» ведёт на страницу входа
                  if (!session) return navigate('/login')
                  // TODO: бэкенд должен проверять права на редактирование
                  openForm(c)
                }}
              />
            )}
          </Collapse>

          {isOrganizer && (
            <Collapse open={creating} className="home__pane">
              <CreateContestForm
                key={formKey}
                initial={editing ?? undefined}
                onSubmit={saveContest}
                onCancel={closeCreate}
              />
              {saveError && <p className="home__state" role="alert">{saveError}</p>}
            </Collapse>
          )}
        </section>
      </main>
      <Footer />
    </div>
  )
}
