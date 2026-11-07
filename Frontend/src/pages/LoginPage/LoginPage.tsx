import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import AuthLayout from '../../components/AuthLayout/AuthLayout'
import { loginRequest, takeAfterLogin } from '../../auth/auth'
import { useRegisterChoice } from '../../components/RegisterChoice/RegisterChoice'

export default function LoginPage() {
  const navigate = useNavigate()
  const { openRegisterChoice } = useRegisterChoice()
  const [login, setLogin] = useState('')
  const [password, setPassword] = useState('')
  const [asOrganizer, setAsOrganizer] = useState(false)
  const [error, setError] = useState('')

  const [busy, setBusy] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!login.trim() || !password) {
      setError('Введите логин и пароль')
      return
    }
    setBusy(true)
    setError('')
    try {
      await loginRequest(login.trim(), password, asOrganizer)
      navigate(takeAfterLogin() ?? '/')
    } catch (err) {
      setError((err as Error).message || 'Не удалось войти')
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthLayout
      title="Вход"
      bottom={
        <button type="button" className="auth__alt-link" onClick={openRegisterChoice}>
          Ещё не зарегистрировались?
        </button>
      }
    >
      <form className="auth__form" onSubmit={handleSubmit} noValidate>
        <input
          className="auth__input"
          type="text"
          name="login"
          autoComplete="username"
          placeholder="Номер телефона или Почта"
          aria-label="Номер телефона или почта"
          aria-invalid={!!error && !login.trim()}
          value={login}
          onChange={(e) => setLogin(e.target.value)}
        />
        <input
          className="auth__input"
          type="password"
          name="password"
          autoComplete="current-password"
          placeholder="Пароль"
          aria-label="Пароль"
          aria-invalid={!!error && !password}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <label className="auth__check">
          <input
            type="checkbox"
            checked={asOrganizer}
            onChange={(e) => setAsOrganizer(e.target.checked)}
          />
          Войти как создатель
        </label>
        <p className="auth__error" role="alert">
          {error}
        </p>
        <button type="submit" className="btn auth__submit" disabled={busy}>
          Войти
        </button>
      </form>
    </AuthLayout>
  )
}
