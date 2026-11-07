import type { ReactNode } from 'react'
import { DIFFICULTY_LABEL, MODE_LABEL, type Contest } from '../../types'
import { formatTimeRange } from '../../utils/format'
import type { Role } from '../../auth/auth'
import './ContestCard.css'

interface Props {
  contest: Contest
  onEnter?: (contest: Contest) => void
  /** Роль вошедшего: создатель — «Редактировать», участник — «Подробнее», гость — «Войти». */
  role?: Role | null
  /** Ячейка раскрыта (показываем подробности вместо краткого вида). */
  open?: boolean
  /** Содержимое раскрытого вида (ContestDetail). Монтируется на время анимации. */
  detail?: ReactNode
}

const BUTTON_LABEL = { organizer: 'Редактировать', participant: 'Подробнее' } as const

export default function ContestCard({ contest, onEnter, role, open = false, detail }: Props) {
  return (
    <article className={`card${open ? ' card--open' : ''}`}>
      <div className="card__compact">
        <h3 className="card__title">{contest.title}</h3>
        <p className="card__meta">
          {MODE_LABEL[contest.mode]}
          <br />
          {formatTimeRange(contest)}
          <br />
          {DIFFICULTY_LABEL[contest.difficulty]}
        </p>
        <p className="card__desc">{contest.description}</p>
        <button type="button" className="btn card__btn" onClick={() => onEnter?.(contest)}>
          {role ? BUTTON_LABEL[role] : 'Войти'}
        </button>
      </div>
      {detail && <div className="card__detail">{detail}</div>}
    </article>
  )
}
