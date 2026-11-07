import { Link, useNavigate } from 'react-router-dom'
import { useRegisterChoice } from '../RegisterChoice/RegisterChoice'
import { useSession } from '../../auth/useSession'
import { clearSession } from '../../auth/auth'
import './Header.css'

export default function Header() {
  const navigate = useNavigate()
  const { openRegisterChoice } = useRegisterChoice()
  const session = useSession()

  return (
    <header className="header">
      <Link to="/" className="header__logo" aria-label="На главную">
        ALGO_DOJO
      </Link>
      <div className="header__actions">
        {session ? (
          <>
            {/* TODO: страница профиля — макета пока нет */}
            <button type="button" className="btn" onClick={() => console.log('Профиль')}>
              Профиль
            </button>
            <button
              type="button"
              className="btn btn--filled"
              onClick={() => {
                clearSession()
                navigate('/')
              }}
            >
              Выйти
            </button>
          </>
        ) : (
          <>
            <button type="button" className="btn" onClick={() => navigate('/login')}>
              Войти
            </button>
            <button type="button" className="btn btn--filled" onClick={openRegisterChoice}>
              Зарегистрироваться
            </button>
          </>
        )}
      </div>
    </header>
  )
}
