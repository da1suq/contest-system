export type ContestMode = 'duel' | 'team'
export type Difficulty = 'easy' | 'medium' | 'hard'

export interface ContestTask {
  /** id задачи на бэкенде (нужен для отправки решения) */
  id?: number
  description: string
  /** Примеры входных/выходных данных; несколько примеров разделяются пустой строкой */
  examples: string
}

export interface Contest {
  id: string
  title: string
  mode: ContestMode
  /** ISO-строки или "HH:mm" — форматируем в formatTimeRange */
  startsAt: string
  endsAt: string
  difficulty: Difficulty
  /** Краткое описание для карточки (по умолчанию — описание первой задачи) */
  description: string
  /** Задачи контеста: у каждой своё описание и примеры (заполняет создатель) */
  tasks?: ContestTask[]
  /** Имя создателя контеста (приходит с бэкенда) */
  creator?: string
}

export const MODE_LABEL: Record<ContestMode, string> = {
  duel: '1 x 1',
  team: 'команда',
}

export const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  easy: 'простой',
  medium: 'средний',
  hard: 'сложно',
}

/** Подсказка в поле ввода, которое появляется после нажатия «участвовать». */
export const JOIN_PLACEHOLDER: Record<ContestMode, string> = {
  duel: 'Ник соперника',
  team: 'Название команды',
}
