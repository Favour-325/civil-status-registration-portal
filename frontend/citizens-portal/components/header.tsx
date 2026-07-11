'use client'

import Link from 'next/link'
import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { Globe, Menu, X } from 'lucide-react'

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [locale, setLocale] = useState('en')

  const pathname = usePathname()

  const locales = [
    { code: 'en', name: 'English' },
    { code: 'fr', name: 'Français' },
  ]

  return (
    <header className="sticky top-0 z-50 w-full  bg-[#C1633B]">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-1">
          <span className="font-heading text-2xl font-semibold text-secondary-foreground">
            CCSRP
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden items-center gap-10 md:flex">
          <Link
            href="/"
            className={`text-sm font-medium text-secondary-foreground hover:text-secondary-foreground/80 transition-colors pb-1 ${pathname === "/" ? "border-b-2 border-[#e7c899]" : "border-b-2 border-transparent" } `}
          >
            Home
          </Link>
          <Link
            href="/birth"
            className={`text-sm font-medium text-secondary-foreground hover:text-secondary-foreground/80 transition-colors ${pathname === "/birth" ? "border-b-2 border-[#e7c899]" : "border-b-2 border-transparent" } `} 
          >
            Birth
          </Link>
          <Link
            href="/marriage"
            className={`text-sm font-medium text-secondary-foreground hover:text-secondary-foreground/80 transition-colors ${pathname === "/marriage" ? "border-b-2 border-[#e7c899]" : "border-b-2 border-transparent" } `}
          >
            Marriage
          </Link>
          <Link
            href="/#contact-us"
            className={`text-sm font-medium text-secondary-foreground hover:text-secondary-foreground/80 transition-colors ${pathname === "/contact-us" ? "border-b-2 border-[#e7c899]" : "border-b-2 border-transparent" } `}
          >
            Contact Us
          </Link>
        </nav>

        {/* Right Actions */}
        <div className="flex items-center gap-4">
          {/* Language Selector */}
          <div className="relative group hidden sm:block">
            <button className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-secondary-foreground hover:opacity-80 transition-colors">
              <Globe className="h-4 w-4" />
              <span>{locale.toUpperCase()}</span>
            </button>
            <div className="absolute right-0 mt-2 w-40 rounded-lg border border-border bg-card p-2 shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
              {locales.map((l) => (
                <button
                  key={l.code}
                  onClick={() => setLocale(l.code)}
                  className={`block w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                    locale === l.code
                      ? 'bg-primary text-primary-foreground font-medium'
                      : 'text-foreground hover:bg-secondary'
                  }`}
                >
                  {l.name}
                </button>
              ))}
            </div>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg hover:bg-secondary transition-colors"
          >
            {mobileMenuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Navigation */}
      {mobileMenuOpen && (
        <div className="border-t border-border bg-secondary md:hidden">
          <nav className="flex flex-col gap-2 px-6 py-4">
            <Link
              href="/"
              className="text-sm font-medium text-foreground hover:text-primary transition-colors px-3 py-2 rounded-lg hover:bg-muted"
            >
              Home
            </Link>
            <Link
              href="/birth"
              className="text-sm font-medium text-foreground hover:text-primary transition-colors px-3 py-2 rounded-lg hover:bg-muted"
            >
              Birth Certificate
            </Link>
            <Link
              href="/marriage"
              className="text-sm font-medium text-foreground hover:text-primary transition-colors px-3 py-2 rounded-lg hover:bg-muted"
            >
              Marriage Certificate
            </Link>
            <Link
              href="/apply"
              className="text-sm font-medium text-foreground hover:text-primary transition-colors px-3 py-2 rounded-lg hover:bg-muted"
            >
              Apply
            </Link>
          </nav>
        </div>
      )}
    </header>
  )
}
