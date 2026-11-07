import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'
import { useNavigate } from 'react-router-dom'
import ContestCard from '../ContestCard/ContestCard'
import ContestDetail, { type JoinState } from '../ContestDetail/ContestDetail'
import type { Contest } from '../../types'
import { createLobby } from '../../api/lobby'
import { isStartEvent, openMatchSocket } from '../../api/match'
import type { Role } from '../../auth/auth'
import './ContestCarousel.css'

interface Props {
  contests: Contest[]
  onEnter?: (contest: Contest) => void
  role?: Role | null
  /** Если передан — справа от ячеек показывается кнопка «+» (только для создателя). */
  onAdd?: () => void
}

/** Должно совпадать с длительностью transition в ContestCarousel.css (.55s) */
const CLOSE_MS = 600
const IDLE: JoinState = { step: 'idle' }

function useVisibleCount(): number {
  const calc = () => (window.innerWidth < 640 ? 1 : window.innerWidth < 960 ? 2 : 3)
  const [count, setCount] = useState(calc)
  useEffect(() => {
    const onResize = () => setCount(calc())
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  return count
}

export default function ContestCarousel({ contests, onEnter, role, onAdd }: Props) {
  const navigate = useNavigate()
  const visible = useVisibleCount()
  const [start, setStart] = useState(0)

  // expandedId — какая ячейка раскрыта; detailId живёт чуть дольше, пока играет анимация закрытия
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [detailId, setDetailId] = useState<string | null>(null)
  // состояние «участвовать» по каждому контесту (ссылка-приглашение, ожидание соперника)
  const [joins, setJoins] = useState<Record<string, JoinState>>({})
  const timer = useRef<number | undefined>(undefined)

  const isParticipant = role === 'participant'
  const isOpen = expandedId !== null

  const maxStart = Math.max(0, contests.length - visible)
  const safeStart = Math.min(start, maxStart)

  const resetOpen = useCallback(() => {
    window.clearTimeout(timer.current)
    setExpandedId(null)
    setDetailId(null)
  }, [])

  useEffect(() => {
    setStart(0)
    resetOpen()
  }, [contests, resetOpen])

  // «участвовать»: POST /lobby/create → ссылка-приглашение → ждём по WebSocket, пока соперник зайдёт
  const socketRef = useRef<(() => void) | null>(null)
  const stopWaiting = () => {
    socketRef.current?.()
    socketRef.current = null
  }

  const startJoin = async (c: Contest) => {
    patchJoin(c.id, { step: 'creating', error: undefined })
    try {
      const lobby = await createLobby(c.id)
      const link = `${window.location.origin}/join/${encodeURIComponent(lobby.token)}?c=${encodeURIComponent(c.id)}`
      patchJoin(c.id, { step: 'waiting', link, token: lobby.token })
      stopWaiting()
      socketRef.current = openMatchSocket(
        lobby.matchId,
        (msg) => {
          if (!isStartEvent(msg)) return
          stopWaiting()
          navigate(`/contest/${c.id}?room=${lobby.matchId}`)
        },
        () => patchJoin(c.id, { step: 'idle', error: 'Соединение с матчем потеряно, попробуйте ещё раз' }),
      )
    } catch (err) {
      patchJoin(c.id, { step: 'idle', error: (err as Error).message || 'Не удалось создать матч' })
    }
  }

  const cancelJoin = (id: string) => {
    stopWaiting()
    patchJoin(id, { step: 'idle', link: undefined, token: undefined, error: undefined })
  }

  useEffect(
    () => () => {
      window.clearTimeout(timer.current)
      socketRef.current?.()
    },
    [],
  )

  const open = (id: string) => {
    window.clearTimeout(timer.current)
    setDetailId(id)
    setExpandedId(id)
  }

  const close = () => {
    setExpandedId(null)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setDetailId(null), CLOSE_MS)
  }

  const patchJoin = (id: string, patch: Partial<JoinState>) =>
    setJoins((prev) => ({ ...prev, [id]: { ...(prev[id] ?? IDLE), ...patch } }))

  const handleEnter = (c: Contest) => {
    if (isParticipant) open(c.id)
    else onEnter?.(c)
  }

  const prev = () => setStart(Math.max(0, safeStart - 1))
  const next = () => setStart(Math.min(maxStart, safeStart + 1))

  const shown = contests.slice(safeStart, safeStart + visible)

  return (
    <div className="carousel">
      <button
        type="button"
        className="carousel__arrow"
        onClick={prev}
        disabled={isOpen || safeStart === 0}
        aria-label="Назад"
      >
        <svg viewBox="0 0 24 40" width="22" height="36" aria-hidden="true">
          <path d="M20 2 4 20l16 18" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      <div
        className={`carousel__track${isOpen ? ' carousel__track--open' : ''}`}
        style={{ '--visible': visible } as CSSProperties}
      >
        {shown.map((c) => {
          const isExpanded = expandedId === c.id
          const hidden = isOpen && !isExpanded
          const join = joins[c.id] ?? IDLE

          return (
            <div
              key={c.id}
              className={`carousel__slot${hidden ? ' carousel__slot--hidden' : ''}`}
              aria-hidden={hidden || undefined}
            >
              <ContestCard
                contest={c}
                role={role}
                open={isExpanded}
                onEnter={handleEnter}
                detail={
                  detailId === c.id ? (
                    <ContestDetail
                      contest={c}
                      index={contests.findIndex((x) => x.id === c.id) + 1}
                      total={contests.length}
                      join={join}
                      onJoinStart={() => startJoin(c)}
                      onJoinCancel={() => cancelJoin(c.id)}
                      onClose={() => {
                        if (join.step === 'waiting') cancelJoin(c.id)
                        close()
                      }}
                    />
                  ) : null
                }
              />
            </div>
          )
        })}
      </div>

      {onAdd && (
        <button type="button" className="carousel__add" onClick={onAdd} aria-label="Добавить контест">
          <svg viewBox="0 0 40 40" width="40" height="40" aria-hidden="true">
            <rect x="2" y="2" width="36" height="36" rx="8" fill="none" stroke="currentColor" strokeWidth="3" />
            <path d="M20 11v18M11 20h18" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          </svg>
        </button>
      )}

      <button
        type="button"
        className="carousel__arrow"
        onClick={next}
        disabled={isOpen || safeStart >= maxStart}
        aria-label="Вперёд"
      >
        <svg viewBox="0 0 24 40" width="22" height="36" aria-hidden="true">
          <path d="m4 2 16 18L4 38" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </div>
  )
}
