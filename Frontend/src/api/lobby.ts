import { api } from './client'

type Raw = Record<string, unknown>

/** POST /lobby/create?contest_id=ID → { match_id, invitation_token } */
export async function createLobby(contestId: string): Promise<{ matchId: number; token: string }> {
  const r = await api<Raw>(`/lobby/create?contest_id=${encodeURIComponent(contestId)}`, { method: 'POST' })
  const matchId = Number(r.match_id)
  const token = String(r.invitation_token ?? '')
  if (!matchId || !token) throw new Error('Бэкенд не вернул match_id или invitation_token')
  return { matchId, token }
}

/** POST /lobby/join/{token} → { match_id, message } */
export async function joinLobby(token: string): Promise<{ matchId: number; contestId?: string }> {
  const r = await api<Raw>(`/lobby/join/${encodeURIComponent(token)}`, { method: 'POST' })
  const matchId = Number(r.match_id)
  if (!matchId) throw new Error('Бэкенд не вернул match_id')
  // contest_id в ответе пока не обещан — если бэкенд добавит, подхватится
  return { matchId, contestId: r.contest_id != null ? String(r.contest_id) : undefined }
}
