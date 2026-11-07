import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import './RegisterChoice.css'

interface Ctx {
  openRegisterChoice: () => void
}

const RegisterChoiceContext = createContext<Ctx>({ openRegisterChoice: () => {} })

/** Хук: вызвать openRegisterChoice() — появится плашка «Участник / Создатель». */
export const useRegisterChoice = () => useContext(RegisterChoiceContext)

export function RegisterChoiceProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  const openRegisterChoice = useCallback(() => setOpen(true), [])
  const close = useCallback(() => setOpen(false), [])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, close])

  const choose = (role: 'participant' | 'creator') => {
    close()
    navigate(`/register/${role}`)
  }

  return (
    <RegisterChoiceContext.Provider value={{ openRegisterChoice }}>
      {children}
      {open && (
        <div className="choice__overlay" onClick={close}>
          <div
            className="choice"
            role="dialog"
            aria-modal="true"
            aria-labelledby="choice-title"
            onClick={(e) => e.stopPropagation()}
          >
            <button type="button" className="choice__close" aria-label="Закрыть" onClick={close}>
              ×
            </button>
            <h2 id="choice-title" className="choice__title">
              Зарегистрироваться как
            </h2>
            <div className="choice__buttons">
              <button type="button" className="btn btn--filled" autoFocus onClick={() => choose('participant')}>
                Участник
              </button>
              <button type="button" className="btn btn--filled" onClick={() => choose('creator')}>
                Создатель
              </button>
            </div>
          </div>
        </div>
      )}
    </RegisterChoiceContext.Provider>
  )
}
