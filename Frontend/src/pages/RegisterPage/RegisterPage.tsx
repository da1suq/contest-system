import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import AuthLayout from '../../components/AuthLayout/AuthLayout'
import { useRegisterChoice } from '../../components/RegisterChoice/RegisterChoice'
import { registerRequest, takeAfterLogin } from '../../auth/auth'

type RegisterRole = 'participant' | 'creator'

const TITLES: Record<RegisterRole, string> = {
  creator: 'Регистрация создателя',
  participant: 'Регистрация участника',
}

interface Field {
  name: string
  placeholder: string
  type?: string
  autoComplete?: string
  optional?: boolean
}

/** Поля формы создателя — по макету. Отчество необязательное (в макете «Отчество*»). */
const CREATOR_FIELDS: Field[] = [
  { name: 'firstName', placeholder: 'Имя', autoComplete: 'given-name' },
  { name: 'lastName', placeholder: 'Фамилия', autoComplete: 'family-name' },
  { name: 'middleName', placeholder: 'Отчество*', autoComplete: 'additional-name', optional: true },
  { name: 'phone', placeholder: 'Номер телефона', type: 'tel', autoComplete: 'tel' },
  { name: 'email', placeholder: 'Почта', type: 'email', autoComplete: 'email' },
  { name: 'password', placeholder: 'Пароль', type: 'password', autoComplete: 'new-password' },
  { name: 'repeat', placeholder: 'Повтор пароля', type: 'password', autoComplete: 'new-password' },
]

/**
 * TODO: макета формы участника пока нет — пока те же поля, что у создателя.
 * Когда появится макет, заменить этот список.
 */
const PARTICIPANT_FIELDS: Field[] = CREATOR_FIELDS

export default function RegisterPage() {
  const { role } = useParams()
  const navigate = useNavigate()
  const { openRegisterChoice } = useRegisterChoice()
  const [values, setValues] = useState<Record<string, string>>({})
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (role !== 'creator' && role !== 'participant') {
    return <Navigate to="/" replace />
  }

  const fields = role === 'creator' ? CREATOR_FIELDS : PARTICIPANT_FIELDS
  const get = (name: string) => values[name] ?? ''
  const isEmpty = (f: Field) => !f.optional && !get(f.name).trim()

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (fields.some(isEmpty)) {
      setError('Заполните все обязательные поля')
      return
    }
    if (get('password') !== get('repeat')) {
      setError('Пароли не совпадают')
      return
    }
    setBusy(true)
    setError('')
    try {
      // API принимает только email + пароль; остальные поля формы пока не уходят на бэкенд
      await registerRequest(get('email').trim(), get('password'), role === 'creator')
      navigate(takeAfterLogin() ?? '/')
    } catch (err) {
      setError((err as Error).message || 'Не удалось зарегистрироваться')
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthLayout
      title={TITLES[role]}
      bottom={
        <button type="submit" form="register-form" className="btn btn--filled" disabled={busy}>
          Зарегистрироваться
        </button>
      }
    >
      <form id="register-form" className="auth__form" onSubmit={handleSubmit} noValidate>
        {fields.map((f) => (
          <input
            key={f.name}
            className="auth__input"
            type={f.type ?? 'text'}
            name={f.name}
            autoComplete={f.autoComplete}
            placeholder={f.placeholder}
            aria-label={f.placeholder.replace('*', '')}
            aria-invalid={!!error && (isEmpty(f) || (f.name === 'repeat' && get('password') !== get('repeat')))}
            value={get(f.name)}
            onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.value }))}
          />
        ))}
        <p className="auth__error" role="alert">
          {error}
        </p>
      </form>
      <button type="button" className="auth__alt-link auth__role-switch" onClick={openRegisterChoice}>
        Выбрать другую роль
      </button>
    </AuthLayout>
  )
}
