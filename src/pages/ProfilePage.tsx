import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { toast } from 'sonner'

import { api, errorMessage } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import type { CurrentUser } from '../auth/types'
import { Button } from '../components/Button'
import { TextField } from '../components/TextField'

type Session = {
  id: string
  browser: string | null
  browserVersion: string | null
  os: string | null
  osVersion: string | null
  deviceType: string
  city: string | null
  country: string | null
  ipAddress: string | null
  createdAt: string
  lastUsedAt: string
  revokedAt: string | null
  current: boolean
}

const labelClass = 'mb-1.5 block font-sans text-xs font-medium uppercase tracking-wide text-muted'

function formatWhen(value: string | null): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString()
}

function deviceLabel(session: Session): string {
  const browser = [session.browser, session.browserVersion].filter(Boolean).join(' ')
  const os = [session.os, session.osVersion].filter(Boolean).join(' ')
  return [browser || 'Unknown browser', os || session.deviceType].filter(Boolean).join(' · ')
}

function placeLabel(session: Session): string {
  const place = [session.city, session.country].filter(Boolean).join(', ')
  return place || 'Unknown location'
}

function Card({
  title,
  detail,
  action,
  children,
}: {
  title: string
  detail: string
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <section className="overflow-hidden rounded border border-line bg-surface">
      <div className="flex items-center justify-between gap-lg border-b border-line px-lg py-3">
        <div>
          <h2 className="font-display text-h4 text-ink">{title}</h2>
          <p className="mt-1 font-sans text-sm text-muted">{detail}</p>
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}

export function ProfilePage() {
  const { updateUser } = useAuth()
  const [account, setAccount] = useState<CurrentUser | null>(null)
  const [profileLoading, setProfileLoading] = useState(true)
  const [sessions, setSessions] = useState<Session[]>([])
  const [sessionsLoading, setSessionsLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [passwordOpen, setPasswordOpen] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [closing, setClosing] = useState<Session | null>(null)
  const [saving, setSaving] = useState(false)

  async function loadSessions() {
    const result = await api<Session[]>('/api/dashboard/auth/sessions')
    setSessions(result.data.filter((session) => session.revokedAt === null))
  }

  useEffect(() => {
    let cancelled = false
    api<CurrentUser>('/api/dashboard/auth/me')
      .then((result) => {
        if (cancelled) return
        setAccount(result.data)
        updateUser(result.data)
      })
      .catch((caught: unknown) => {
        if (!cancelled) toast.error(errorMessage(caught))
      })
      .finally(() => {
        if (!cancelled) setProfileLoading(false)
      })
    api<Session[]>('/api/dashboard/auth/sessions')
      .then((result) => {
        if (!cancelled) setSessions(result.data.filter((session) => session.revokedAt === null))
      })
      .catch((caught: unknown) => {
        if (!cancelled) toast.error(errorMessage(caught))
      })
      .finally(() => {
        if (!cancelled) setSessionsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!passwordOpen && !closing) return
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape' || saving) return
      setPasswordOpen(false)
      setClosing(null)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [closing, passwordOpen, saving])

  function startEdit() {
    if (!account) return
    setFirstName(account.firstName)
    setLastName(account.lastName)
    setEditing(true)
  }

  async function saveProfile(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    try {
      const result = await api<CurrentUser>('/api/dashboard/auth/me', {
        method: 'PATCH',
        body: { firstName: firstName.trim(), lastName: lastName.trim() },
      })
      setAccount(result.data)
      updateUser(result.data)
      setEditing(false)
      toast.success('Profile saved.')
    } catch (caught) {
      toast.error(errorMessage(caught))
    } finally {
      setSaving(false)
    }
  }

  function openPassword() {
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
    setPasswordOpen(true)
  }

  async function changePassword(event: FormEvent) {
    event.preventDefault()
    if (newPassword !== confirmPassword) {
      toast.warning('New password and confirmation do not match')
      return
    }
    if (newPassword.length < 8) {
      toast.warning('New password must be at least 8 characters')
      return
    }
    setSaving(true)
    try {
      await api<undefined>('/api/dashboard/auth/change-password', {
        body: { currentPassword, newPassword },
      })
      setPasswordOpen(false)
      toast.success('Password changed. Other sessions were signed out. This browser stays signed in.')
      await loadSessions()
    } catch (caught) {
      toast.error(errorMessage(caught))
    } finally {
      setSaving(false)
    }
  }

  async function closeSession() {
    if (!closing) return
    setSaving(true)
    try {
      await api<undefined>(`/api/dashboard/auth/sessions/${closing.id}`, { method: 'DELETE' })
      setSessions((current) => current.filter((session) => session.id !== closing.id))
      setClosing(null)
      toast.success('Session signed out.')
    } catch (caught) {
      toast.error(errorMessage(caught))
      setClosing(null)
    } finally {
      setSaving(false)
    }
  }

  const orderedSessions = [
    ...sessions.filter((session) => session.current),
    ...sessions.filter((session) => !session.current),
  ]
  const namesReady = firstName.trim().length > 0 && lastName.trim().length > 0

  return (
    <div className="flex max-w-4xl flex-col gap-lg">
      <Card
        title="Profile"
        detail="The account signed in on this browser."
        action={
          account && !editing ? (
            <Button variant="secondary" size="sm" onClick={startEdit}>
              Edit
            </Button>
          ) : editing ? (
            <div className="flex gap-sm">
              <Button variant="secondary" size="sm" disabled={saving} onClick={() => setEditing(false)}>
                Cancel
              </Button>
              <Button type="submit" form="profileForm" size="sm" disabled={saving || !namesReady}>
                Save
              </Button>
            </div>
          ) : null
        }
      >
        {profileLoading ? <p className="px-lg py-lg font-sans text-sm text-muted">Loading profile…</p> : null}
        {account ? (
          <form id="profileForm" onSubmit={(event) => void saveProfile(event)}>
            <dl className="grid grid-cols-1 gap-lg p-lg sm:grid-cols-2">
              <div>
                {editing ? (
                  <TextField
                    id="firstName"
                    label="First name"
                    value={firstName}
                    onChange={(event) => setFirstName(event.target.value)}
                    autoComplete="given-name"
                    required
                  />
                ) : (
                  <>
                    <dt className={labelClass}>First name</dt>
                    <dd className="font-sans text-sm text-copy">{account.firstName}</dd>
                  </>
                )}
              </div>
              <div>
                {editing ? (
                  <TextField
                    id="lastName"
                    label="Last name"
                    value={lastName}
                    onChange={(event) => setLastName(event.target.value)}
                    autoComplete="family-name"
                    required
                  />
                ) : (
                  <>
                    <dt className={labelClass}>Last name</dt>
                    <dd className="font-sans text-sm text-copy">{account.lastName}</dd>
                  </>
                )}
              </div>
              <div>
                <dt className={labelClass}>Email</dt>
                <dd className="font-sans text-sm text-copy">{account.email}</dd>
              </div>
              <div>
                <dt className={labelClass}>Roles</dt>
                <dd className="font-sans text-sm text-copy">
                  {account.roles.length > 0 ? account.roles.map((role) => role.name).join(', ') : '—'}
                </dd>
              </div>
              <div>
                <dt className={labelClass}>Last sign-in</dt>
                <dd className="font-sans text-sm text-copy">{formatWhen(account.lastLoginAt)}</dd>
              </div>
            </dl>
          </form>
        ) : null}
      </Card>

      <Card title="Password" detail="Other open sessions are signed out. This browser stays signed in.">
        <div className="p-lg">
          <Button onClick={openPassword}>Update password</Button>
        </div>
      </Card>

      <Card title="Sessions" detail="Browsers that are still signed in to this account.">
        {sessionsLoading ? (
          <p className="px-lg py-lg font-sans text-sm text-muted">Loading sessions…</p>
        ) : orderedSessions.length === 0 ? (
          <p className="px-lg py-lg font-sans text-sm text-muted">No open sessions.</p>
        ) : (
          <ul>
            {orderedSessions.map((session) => (
              <li
                key={session.id}
                className="flex flex-wrap items-center justify-between gap-lg border-b border-line px-lg py-lg last:border-b-0"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-sm">
                    <span className="font-sans text-sm font-medium text-ink">{deviceLabel(session)}</span>
                    {session.current ? (
                      <span className="rounded-full bg-gold/15 px-2 py-0.5 font-sans text-xs font-medium text-gold-link">
                        This device
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 font-sans text-xs text-muted">
                    {placeLabel(session)}
                    {session.ipAddress ? ` · ${session.ipAddress}` : ''}
                  </p>
                  <p className="mt-0.5 font-sans text-xs text-muted">
                    Signed in {formatWhen(session.createdAt)} · Last used {formatWhen(session.lastUsedAt)}
                  </p>
                </div>
                {session.current ? null : (
                  <Button variant="secondary" size="sm" disabled={saving} onClick={() => setClosing(session)}>
                    Sign out
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>

      {passwordOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Close dialog"
            disabled={saving}
            onClick={() => {
              if (!saving) setPasswordOpen(false)
            }}
          />
          <form
            role="dialog"
            aria-modal="true"
            aria-labelledby="password-dialog-title"
            className="relative w-full max-w-sm rounded border border-line bg-surface p-lg"
            onSubmit={(event) => void changePassword(event)}
          >
            <h2 id="password-dialog-title" className="font-display text-h3 text-ink">
              Update password
            </h2>
            <p className="mt-sm font-sans text-sm text-muted">
              This browser stays signed in. Other sessions are signed out.
            </p>
            <div className="mt-lg space-y-md">
              <TextField
                id="currentPassword"
                label="Current password"
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                required
              />
              <TextField
                id="newPassword"
                label="New password"
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                minLength={8}
                required
              />
              <TextField
                id="confirmPassword"
                label="Confirm password"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                minLength={8}
                required
              />
            </div>
            <div className="mt-lg flex justify-end gap-sm">
              <Button
                variant="secondary"
                disabled={saving}
                onClick={() => {
                  if (!saving) setPasswordOpen(false)
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving || !currentPassword || !newPassword || !confirmPassword}>
                Save
              </Button>
            </div>
          </form>
        </div>
      ) : null}

      {closing ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Close dialog"
            disabled={saving}
            onClick={() => {
              if (!saving) setClosing(null)
            }}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="session-dialog-title"
            className="relative w-full max-w-sm rounded border border-line bg-surface p-lg"
          >
            <h2 id="session-dialog-title" className="font-display text-h3 text-ink">
              Sign out this session?
            </h2>
            <p className="mt-sm font-sans text-sm text-muted">{deviceLabel(closing)} will need to sign in again.</p>
            <div className="mt-lg flex justify-end gap-sm">
              <Button variant="secondary" disabled={saving} onClick={() => setClosing(null)}>
                Cancel
              </Button>
              <Button disabled={saving} onClick={() => void closeSession()}>
                Sign out
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
