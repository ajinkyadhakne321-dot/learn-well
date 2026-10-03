import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Menu, Search, X } from 'lucide-react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { navigationItems } from '../data/navigation'
import { useStudentWorkspace } from '../context/StudentWorkspaceState'
import '../platform.css'

export function AppShell() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [searchText, setSearchText] = useState('')
  const mainRef = useRef<HTMLElement>(null)
  const menuToggleRef = useRef<HTMLButtonElement>(null)
  const navigationRef = useRef<HTMLElement>(null)
  const location = useLocation()
  const previousPath = useRef(location.pathname)
  const navigate = useNavigate()
  const { profile, preferences } = useStudentWorkspace()
  const profileInitials = profile.name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase()

  useEffect(() => {
    if (previousPath.current === location.pathname) return
    previousPath.current = location.pathname
    setMenuOpen(false)
    mainRef.current?.querySelector<HTMLElement>('h1')?.focus()
  }, [location.pathname])

  useEffect(() => {
    if (!menuOpen) return
    navigationRef.current?.querySelector<HTMLElement>('a')?.focus()
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setMenuOpen(false)
        menuToggleRef.current?.focus()
      }
    }
    document.addEventListener('keydown', closeOnEscape)
    return () => document.removeEventListener('keydown', closeOnEscape)
  }, [menuOpen])

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const query = searchText.trim()
    navigate(query ? `/?q=${encodeURIComponent(query)}` : '/')
  }

  return (
    <>
      <a className="skip-link" href="#main-content">Skip to main content</a>
      <div
        className="app-layout"
        data-high-contrast={preferences.highContrast}
        data-text-size={preferences.textSize}
        data-underline-links={preferences.underlineLinks}
        data-stronger-focus={preferences.strongerFocus}
      >
        {menuOpen && (
          <button className="nav-scrim" type="button" tabIndex={-1} aria-label="Close navigation menu" onClick={() => setMenuOpen(false)} />
        )}
        <aside className={`sidebar${menuOpen ? ' sidebar-open' : ''}`}>
          <Link className="brand" to="/" aria-label="Open student dashboard">
            <span className="brand-mark" aria-hidden="true">L</span>
            <span className="brand-name">Learn<span>well</span></span>
          </Link>
          <p className="nav-label">STUDENT SPACE</p>
          <nav id="primary-navigation" className="primary-nav" aria-label="Primary navigation" ref={navigationRef}>
            {navigationItems.map(({ label, path, icon: Icon }) => (
              <NavLink
                key={path}
                to={path}
                end={path === '/'}
                className={({ isActive }) => `nav-link${isActive ? ' nav-link-active' : ''}`}
                onClick={() => setMenuOpen(false)}
              >
                <Icon size={18} strokeWidth={1.8} aria-hidden="true" />
                <span>{label}</span>
              </NavLink>
            ))}
          </nav>
          <div className="sidebar-note">
            <span className="note-mark" aria-hidden="true">i</span>
            <p>Signed in as<br /><strong>{profile.email}</strong></p>
          </div>
        </aside>

        <div className="workspace">
          <header className="topbar">
            <button
              className="icon-button menu-toggle"
              ref={menuToggleRef}
              type="button"
              aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={menuOpen}
              aria-controls="primary-navigation"
              onClick={() => setMenuOpen((open) => !open)}
            >
              {menuOpen ? <X size={21} aria-hidden="true" /> : <Menu size={21} aria-hidden="true" />}
            </button>
            <div className="topbar-context">
              <span className="context-kicker">LEARNING SPACE</span>
              <span className="context-status"><span aria-hidden="true" /> Student account</span>
            </div>
            <form className="search-form" role="search" aria-label="Search the learning platform" onSubmit={handleSearch}>
              <label className="visually-hidden" htmlFor="platform-search">Search courses, materials, or assignments</label>
              <Search size={18} aria-hidden="true" />
              <input
                id="platform-search"
                type="search"
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
                placeholder="Search your learning"
              />
              <button type="submit" aria-label="Search learning content"><span className="search-button-text">Search</span><Search size={15} aria-hidden="true" /></button>
            </form>
            <Link className="student-profile" to="/profile" aria-label={`Open profile for ${profile.name}`}>
              <span className="profile-initials" aria-hidden="true">{profileInitials}</span>
              <span className="profile-name">{profile.name}</span>
            </Link>
          </header>
          <main id="main-content" className="main-content" ref={mainRef} tabIndex={-1}>
            <Outlet />
          </main>
          <footer className="page-footer">
            <span>Learnwell Student Platform</span>
            <span>Accessible prototype · Sample data</span>
          </footer>
        </div>
      </div>
    </>
  )
}