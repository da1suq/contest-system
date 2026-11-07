import './Footer.css'

const LINKS = [
  { label: 'О нас', href: '#about' },
  { label: 'FAQ', href: '#faq' },
  { label: 'Юридические документы', href: '#legal' },
  { label: 'Поддержка', href: '#support' },
]

export default function Footer() {
  return (
    <footer className="footer">
      <nav className="footer__nav" aria-label="Дополнительная навигация">
        {LINKS.map((l) => (
          <a key={l.href} href={l.href}>
            {l.label}
          </a>
        ))}
      </nav>
    </footer>
  )
}
