import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { toast } from 'sonner'

import { useAuth } from '../auth/AuthContext'
import { navigation, titleForPath, type NavChild, type NavItem } from '../navigation'
import { Button } from './Button'

function linkClass(active: boolean, child = false) {
  const shape = child ? 'rounded-md px-2.5 py-1.5' : 'rounded-lg px-2.5 py-2'
  const state = active
    ? 'bg-gold/10 text-gold-link'
    : child
      ? 'text-muted hover:text-ink'
      : 'text-muted hover:bg-gold/10 hover:text-ink'
  return `relative flex w-full items-center text-left font-sans text-body-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold ${shape} ${state}`
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" aria-hidden="true">
      {open ? (
        <path d="M5 7.5 10 12.5 15 7.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      ) : (
        <path d="M7.5 5 12.5 10 7.5 15" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      )}
    </svg>
  )
}

function SidebarNav({ onNavigate }: { onNavigate: () => void }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="shrink-0 border-b border-line px-1 pb-5">
        <NavLink
          to="/"
          onClick={onNavigate}
          className="font-display text-2xl font-semibold leading-none tracking-tight text-ink"
        >
          TZ Part
        </NavLink>
      </div>
      <nav aria-label="Dashboard" className="mt-4 min-h-0 flex-1 space-y-1 overflow-y-auto">
        {navigation.map((item) =>
          item.children ? (
            <NavSection key={item.label} item={item} onNavigate={onNavigate} />
          ) : (
            <NavLink
              key={item.label}
              to={item.to ?? '/'}
              end
              onClick={onNavigate}
              className={({ isActive }) => linkClass(isActive)}
            >
              {item.label}
            </NavLink>
          ),
        )}
      </nav>
    </div>
  )
}

function NavSection({ item, onNavigate }: { item: NavItem; onNavigate: () => void }) {
  const { pathname } = useLocation()
  const children = item.children ?? []
  const childActive = children.some(
    (child) => pathname === child.to || pathname.startsWith(`${child.to}/`),
  )
  const [open, setOpen] = useState(childActive)

  useEffect(() => {
    if (childActive) setOpen(true)
  }, [childActive])

  return (
    <div>
      <div className={`flex items-stretch overflow-hidden rounded-lg ${childActive ? 'bg-gold/10 text-gold-link' : 'text-muted'}`}>
        <button
          type="button"
          className={`inline-flex min-w-0 flex-1 items-center px-2.5 py-2 text-left font-sans text-xs font-medium ${childActive ? '' : 'hover:bg-gold/10 hover:text-ink'}`}
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
        >
          {item.label}
        </button>
        <button
          type="button"
          className={`inline-flex shrink-0 items-center justify-center px-2 ${childActive ? 'text-gold-link' : 'text-muted hover:text-ink'}`}
          aria-label={open ? `Collapse ${item.label}` : `Expand ${item.label}`}
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
        >
          <Chevron open={open} />
        </button>
      </div>
      {open ? (
        <div className="mt-1 flex items-stretch pl-1">
          <div className="mx-2 w-px shrink-0 bg-line" aria-hidden="true" />
          <div className="min-w-0 flex-1 space-y-0.5 py-0.5">
            {children.map((child) => (
              <ChildLink key={child.to} child={child} onNavigate={onNavigate} />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}

function ChildLink({ child, onNavigate }: { child: NavChild; onNavigate: () => void }) {
  return (
    <NavLink to={child.to} onClick={onNavigate} className={({ isActive }) => linkClass(isActive, true)}>
      {({ isActive }) => (
        <>
          {child.label}
          {isActive ? (
            <span className="absolute right-0 top-1/2 h-[70%] w-[3px] -translate-y-1/2 rounded-l-sm bg-gold-link" aria-hidden="true" />
          ) : null}
        </>
      )}
    </NavLink>
  )
}

function MenuButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      className="inline-flex h-[42px] w-[42px] items-center justify-center rounded border border-line text-ink md:hidden"
      aria-label={label}
      onClick={onClick}
    >
      <svg viewBox="0 0 20 20" className="h-5 w-5" aria-hidden="true">
        <path d="M3 5h14M3 10h14M3 15h14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    </button>
  )
}

function useDesktop() {
  const query = '(min-width: 768px)'
  const [desktop, setDesktop] = useState(() => window.matchMedia(query).matches)

  useEffect(() => {
    const media = window.matchMedia(query)
    const onChange = () => setDesktop(media.matches)
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [])

  return desktop
}

export function DashboardLayout() {
  const { user, logout } = useAuth()
  const { pathname } = useLocation()
  const desktop = useDesktop()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [confirmLogout, setConfirmLogout] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const title = titleForPath(pathname)
  const sidebarOpen = desktop || drawerOpen

  useEffect(() => {
    setDrawerOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!confirmLogout) return
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !signingOut) setConfirmLogout(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [confirmLogout, signingOut])

  async function confirmAndLogout() {
    setSigningOut(true)
    try {
      await logout()
      toast.success('Signed out')
    } catch {
      toast.error('Could not sign out')
    } finally {
      setSigningOut(false)
      setConfirmLogout(false)
    }
  }

  useEffect(() => {
    document.body.style.overflow = !desktop && drawerOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [desktop, drawerOpen])

  return (
    <div className="flex min-h-screen bg-page">
      {!desktop && drawerOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/40"
          aria-label="Close menu"
          onClick={() => setDrawerOpen(false)}
        />
      ) : null}
      <aside
        inert={!sidebarOpen ? true : undefined}
        className={`fixed top-0 z-50 flex h-screen w-[220px] flex-col border-r border-line bg-surface p-3 md:sticky md:z-auto md:shrink-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'} ${!desktop && drawerOpen ? 'shadow-lg' : ''}`}
      >
        <SidebarNav onNavigate={() => setDrawerOpen(false)} />
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-md border-b border-line bg-surface px-lg py-sm">
          <div className="flex min-w-0 items-center gap-sm">
            <MenuButton label="Open menu" onClick={() => setDrawerOpen(true)} />
            <h1 className="truncate font-display text-h4 text-ink">{title}</h1>
          </div>
          <div className="flex shrink-0 items-center gap-md">
            <span className="max-w-[140px] truncate font-sans text-sm text-copy sm:max-w-none">{user?.name}</span>
            <Link to="/docs" className="font-sans text-sm font-medium text-gold-link">
              Docs
            </Link>
            <Button variant="primary" size="sm" onClick={() => setConfirmLogout(true)}>
              Log out
            </Button>
          </div>
        </header>
        <div className="flex-1 p-xl">
          <Outlet />
        </div>
      </div>
      {confirmLogout ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Close dialog"
            disabled={signingOut}
            onClick={() => {
              if (!signingOut) setConfirmLogout(false)
            }}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="logout-dialog-title"
            className="relative w-full max-w-sm rounded border border-line bg-surface p-lg"
          >
            <h2 id="logout-dialog-title" className="font-display text-h3 text-ink">
              Log out?
            </h2>
            <p className="mt-sm font-sans text-sm text-muted">You will need to sign in again on this browser.</p>
            <div className="mt-lg flex justify-end gap-sm">
              <Button variant="secondary" disabled={signingOut} onClick={() => setConfirmLogout(false)}>
                Cancel
              </Button>
              <Button disabled={signingOut} onClick={() => void confirmAndLogout()}>
                Log out
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
