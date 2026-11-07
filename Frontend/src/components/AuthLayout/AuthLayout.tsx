import type { ReactNode } from 'react'
import Header from '../Header/Header'
import Footer from '../Footer/Footer'
import './AuthLayout.css'

interface Props {
  title: string
  children: ReactNode
  /** Блок внизу карточки (кнопка и ссылка на соседнюю страницу). */
  bottom: ReactNode
}

export default function AuthLayout({ title, children, bottom }: Props) {
  return (
    <div className="auth">
      <Header />
      <main className="auth__main">
        <section className="auth__card" aria-labelledby="auth-title">
          <h1 id="auth-title" className="auth__title">
            {title}
          </h1>
          {children}
          <div className="auth__bottom">{bottom}</div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
