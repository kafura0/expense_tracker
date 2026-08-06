'use client'

import { useEffect } from 'react'

const LINKS = [
  { href: '/', label: 'Home', initialActive: true },
  { href: '#features', label: 'Features', initialActive: false },
  { href: '#pricing', label: 'Pricing', initialActive: false },
]

export function LandingNav() {
  useEffect(() => {
    const handleScroll = () => {
      const sections = document.querySelectorAll('section')
      const navLinks = document.querySelectorAll('header nav a')
      let current = ''
      sections.forEach((section) => {
        if (window.scrollY >= section.offsetTop - 100) {
          current = section.getAttribute('id') || ''
        }
      })
      navLinks.forEach((link) => {
        const href = link.getAttribute('href') || ''
        if (href === `#${current}`) {
          link.classList.add('text-primary', 'font-bold')
          link.classList.remove('text-muted-foreground')
        } else {
          link.classList.remove('text-primary', 'font-bold')
          link.classList.add('text-muted-foreground')
        }
      })
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <nav className="hidden md:flex gap-6 items-center">
      {LINKS.map((link) => (
        <a
          key={link.label}
          href={link.href}
          className={
            link.initialActive
              ? 'text-primary font-bold border-b-2 border-primary pb-1 font-label-sm text-label-sm'
              : 'text-muted-foreground hover:text-foreground transition-colors duration-150 px-3 py-1 rounded font-label-sm text-label-sm'
          }
        >
          {link.label}
        </a>
      ))}
    </nav>
  )
}
