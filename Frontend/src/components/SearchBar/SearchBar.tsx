import { useState, type FormEvent } from 'react'
import './SearchBar.css'

interface Props {
  value: string
  onChange: (value: string) => void
  onSubmit?: (value: string) => void
}

export default function SearchBar({ value, onChange, onSubmit }: Props) {
  const [focused, setFocused] = useState(false)

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    onSubmit?.(value)
  }

  return (
    <form
      className={`search${focused ? ' search--focused' : ''}`}
      role="search"
      onSubmit={handleSubmit}
    >
      <svg className="search__icon" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
        <circle cx="10.5" cy="10.5" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <path d="M15.5 15.5 21 21" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
      <input
        className="search__input"
        type="search"
        value={value}
        placeholder="Название, режим или сложность"
        aria-label="Поиск контеста"
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
      <button type="submit" className="search__btn">
        поиск
      </button>
    </form>
  )
}
