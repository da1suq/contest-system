import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import Header from '../../components/Header/Header'
import Footer from '../../components/Footer/Footer'
import { useSession } from '../../auth/useSession'
import { rememberAfterLogin } from '../../auth/auth'
import { joinLobby } from '../../api/lobby'

/** Соперник приходит сюда по ссылке /join/<токен> (или вводит токен вручную на /join). */
export default function JoinPage() {
  const { token: tokenParam } = useParams()
  const [search] = useSearchParams()
  const location = useLocation()
  const navigate = useNavigate()
  const session = useSession()
  const [token, setToken] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const started = useRef(false)

  const join = async (input: string) => {
    setBusy(true)
    setError('')
    try {
      // можно вставить ссылку целиком: берём токен и ?c= из неё
      let t = input.trim()
      let c = search.get('c')
      const m = /\/join\/([^/?#]+)(?:\?(?:.*&)?c=([^&#]+))?/.exec(t)
      if (m) {
        t = decodeURIComponent(m[1])
        c = m[2] ? decodeURIComponent(m[2]) : c
      }
      const lobby = await joinLobby(t)
      const contestId = c ?? lobby.contestId
      if (!contestId) throw new Error('Не удалось определить контест — откройте ссылку-приглашение целиком')
      navigate(`/contest/${contestId}?room=${lobby.matchId}`, { replace: true })
    } catch (err) {
      setError((err as Error).message || 'Не удалось присоединиться')
      setBusy(false)
    }
  }

  useEffect(() => {
    if (!session || !tokenParam || started.current) return
    started.current = true // защита от двойного запуска эффекта в StrictMode
    void join(tokenParam)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, tokenParam])

  if (!session) {
    // после входа вернёмся на эту же ссылку
    rememberAfterLogin(location.pathname + location.search)
    return <Navigate to="/login" replace />
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (token.trim()) void join(token.trim())
  }

  return (
    <div className="home">
      <Header />
      <main className="home__main">
        <h1 className="home__title">Присоединиться к матчу</h1>
        {tokenParam ? (
          <p className="home__state">{busy ? 'Подключаемся к матчу…' : error}</p>
        ) : (
          <form onSubmit={onSubmit} style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <input
              className="auth__input"
              style={{ maxWidth: 360 }}
              placeholder="Ссылка или токен приглашения"
              aria-label="Токен приглашения"
              value={token}
              onChange={(e) => setToken(e.target.value)}
            />
            <button type="submit" className="btn btn--filled" disabled={busy || !token.trim()}>
              Войти в матч
            </button>
          </form>
        )}
        {!tokenParam && error && <p className="home__state" role="alert">{error}</p>}
      </main>
      <Footer />
    </div>
  )
}
