import { useState } from 'react'
import { DIFFICULTY_LABEL, MODE_LABEL, type Contest } from '../../types'
import { formatDuration, formatStart } from '../../utils/format'
import './ContestDetail.css'

/** idle — кнопка «участвовать»; creating — создаём комнату; waiting — ждём, пока соперник перейдёт по ссылке. */
export type JoinStep = 'idle' | 'creating' | 'waiting'

export interface JoinState {
  step: JoinStep
  /** Ссылка-приглашение для соперника */
  link?: string
  /** Токен приглашения (если ссылка не открывается — можно ввести вручную на /join) */
  token?: string
  error?: string
}

interface Props {
  contest: Contest
  index: number
  total: number
  join: JoinState
  onJoinStart: () => void
  onJoinCancel: () => void
  onClose: () => void
}

export default function ContestDetail({ contest, index, total, join, onJoinStart, onJoinCancel, onClose }: Props) {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    if (!join.link) return
    try {
      await navigator.clipboard.writeText(join.link)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    } catch {
      /* буфер недоступен — ссылку можно выделить и скопировать вручную */
    }
  }

  const duration = formatDuration(contest)
  const counterIndex = contest.mode === 'duel' ? 1 : index
  const counterTotal = contest.mode === 'duel' ? 2 : total

  return (
    <div className="detail">
      <h3 className="detail__title">{contest.title}</h3>

      <div className="detail__body">
        <div className="detail__facts">
          <p className="detail__fact">
            {MODE_LABEL[contest.mode]}
            <br />
            {formatStart(contest)}
            {duration && (
              <>
                <br />
                {duration}
              </>
            )}
          </p>
          <p className="detail__fact">
            создатель:
            <br />
            {contest.creator ?? '—'}
          </p>
          <p className="detail__fact">
            сложность:
            <br />
            {DIFFICULTY_LABEL[contest.difficulty]}
          </p>
        </div>
        <p className="detail__desc">{contest.description}</p>
      </div>

      <div className="detail__footer">
        <div className="detail__actions">
          <div className="detail__join" key={join.step}>
            {join.step === 'idle' && (
              <button type="button" className="btn btn--filled detail__btn" onClick={onJoinStart}>
                участвовать
              </button>
            )}

            {join.step === 'creating' && (
              <button type="button" className="btn btn--filled detail__btn" disabled>
                создаём матч…
              </button>
            )}

            {join.step === 'waiting' && (
              <>
                <div className="join-form">
                  <input
                    className="join-form__input"
                    readOnly
                    value={join.link ?? ''}
                    aria-label="Ссылка для соперника"
                    onFocus={(e) => e.currentTarget.select()}
                  />
                  <button type="button" className="join-form__ok" onClick={copy} aria-label="Скопировать ссылку">
                    {copied ? '✓' : '⧉'}
                  </button>
                </div>
                <p className="detail__status">
                  Отправьте ссылку сопернику. Токен: <b>{join.token}</b>
                  <br />
                  Ожидание соперника…
                </p>
                <button type="button" className="btn detail__btn" onClick={onJoinCancel}>
                  отменить
                </button>
              </>
            )}

            {join.error && (
              <p className="detail__status detail__error" role="alert">
                {join.error}
              </p>
            )}
          </div>

          <button type="button" className="btn detail__btn" onClick={onClose}>
            назад
          </button>
        </div>

        <span className="detail__counter" aria-label={`${counterIndex} из ${counterTotal}`}>
          {counterIndex} / {counterTotal}
        </span>
      </div>
    </div>
  )
}
