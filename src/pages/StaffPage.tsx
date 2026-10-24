import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { toast } from 'sonner'

import { api, errorMessage } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import type { RoleSummary } from '../auth/types'
import { Button } from '../components/Button'
import { CheckOption } from '../components/CheckOption'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { SidePanel } from '../components/SidePanel'
import { TextField } from '../components/TextField'

type StaffUser = {
  id: string
  email: string
  firstName: string
  lastName: string
  name: string
  status: 'active' | 'disabled'
  roles: RoleSummary[]
  lastLoginAt: string | null
  createdAt: string
  updatedAt: string
}

type RoleOption = {
  id: string
  name: string
  slug: string
}

type Draft = {
  firstName: string
  lastName: string
  email: string
  password: string
  status: 'active' | 'disabled'
  roleIds: string[]
}

const emptyDraft: Draft = {
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  status: 'active',
  roleIds: [],
}

const controlClass =
  'h-[42px] w-full rounded border border-line bg-white px-3.5 font-sans text-sm text-copy outline-none hover:border-ink focus:border-gold focus:shadow-focus disabled:cursor-not-allowed disabled:border-line disabled:bg-wash'

function formatWhen(value: string | null): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString()
}

function draftFrom(user: StaffUser): Draft {
  return {
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    password: '',
    status: user.status,
    roleIds: user.roles.map((role) => role.id),
  }
}

function ActionIcon({
  label,
  onClick,
  children,
}: {
  label: string
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="inline-flex h-8 w-8 items-center justify-center rounded border border-line text-ink hover:border-ink hover:bg-ink-wash"
    >
      {children}
    </button>
  )
}

function EyeIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" aria-hidden="true">
      <path
        d="M2.5 10S5.5 5.5 10 5.5 17.5 10 17.5 10 14.5 14.5 10 14.5 2.5 10 2.5 10Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <circle cx="10" cy="10" r="2" fill="none" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  )
}

function PencilIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" aria-hidden="true">
      <path
        d="M11.5 4.5 15.5 8.5 7 17H3v-4L11.5 4.5Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" aria-hidden="true">
      <path
        d="M4.5 6.5h11M8 6.5V4.5h4v2M7 6.5l.5 9h5l.5-9"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function StaffPage() {
  const { user } = useAuth()
  const canWrite = (user?.permissions ?? []).includes('dashboard.users.write')
  const [staff, setStaff] = useState<StaffUser[]>([])
  const [roles, setRoles] = useState<RoleOption[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [mode, setMode] = useState<'create' | 'view' | 'edit' | null>(null)
  const [selected, setSelected] = useState<StaffUser | null>(null)
  const [draft, setDraft] = useState<Draft>(emptyDraft)
  const [removing, setRemoving] = useState<StaffUser | null>(null)
  const [staffLoaded, setStaffLoaded] = useState(false)

  const formOpen = mode !== null
  const readOnly = mode === 'view' || !canWrite
  const editingSelf = mode !== 'create' && selected?.id === user?.id

  useEffect(() => {
    let cancelled = false
    Promise.allSettled([api<StaffUser[]>('/api/dashboard/users'), api<RoleOption[]>('/api/dashboard/roles')])
      .then(([staffResult, roleResult]) => {
        if (cancelled) return
        if (staffResult.status === 'fulfilled') {
          setStaff(staffResult.value.data)
          setStaffLoaded(true)
        } else toast.error(errorMessage(staffResult.reason))
        if (roleResult.status === 'fulfilled') setRoles(roleResult.value.data.map((role) => ({ id: role.id, name: role.name, slug: role.slug })))
        else toast.error(errorMessage(roleResult.reason))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  function closeForm() {
    if (saving || removing) return
    setMode(null)
    setSelected(null)
  }

  function startCreate() {
    setMode('create')
    setSelected(null)
    setDraft(emptyDraft)
  }

  function openPerson(person: StaffUser, next: 'view' | 'edit') {
    setMode(next)
    setSelected(person)
    setDraft(draftFrom(person))
  }

  function toggleRole(id: string) {
    setDraft((current) => ({
      ...current,
      roleIds: current.roleIds.includes(id) ? current.roleIds.filter((item) => item !== id) : [...current.roleIds, id],
    }))
  }

  async function saveStaff(event: FormEvent) {
    event.preventDefault()
    if (mode === 'view') return
    setSaving(true)
    const body = {
      firstName: draft.firstName.trim(),
      lastName: draft.lastName.trim(),
      email: draft.email.trim(),
      roleIds: draft.roleIds,
      ...(editingSelf ? {} : { status: draft.status }),
      ...(draft.password ? { password: draft.password } : {}),
    }
    try {
      if (mode === 'create') {
        const result = await api<StaffUser>('/api/dashboard/users', { body })
        setStaff((current) => [...current, result.data])
        toast.success('Staff member created.')
      } else if (selected) {
        const result = await api<StaffUser>(`/api/dashboard/users/${selected.id}`, { method: 'PATCH', body })
        setStaff((current) => current.map((person) => (person.id === result.data.id ? result.data : person)))
        toast.success('Staff member saved.')
      }
      closeForm()
    } catch (caught) {
      toast.error(errorMessage(caught))
    } finally {
      setSaving(false)
    }
  }

  async function removeStaff() {
    if (!removing) return
    setSaving(true)
    try {
      await api<undefined>(`/api/dashboard/users/${removing.id}`, { method: 'DELETE' })
      setStaff((current) => current.filter((person) => person.id !== removing.id))
      setRemoving(null)
      setMode(null)
      setSelected(null)
      toast.success('Staff member deleted.')
    } catch (caught) {
      setRemoving(null)
      toast.error(errorMessage(caught))
    } finally {
      setSaving(false)
    }
  }

  const passwordReady = mode === 'create' ? draft.password.length >= 8 : draft.password.length === 0 || draft.password.length >= 8
  const formReady =
    draft.firstName.trim().length > 0 && draft.lastName.trim().length > 0 && draft.email.trim().length > 0 && passwordReady

  return (
    <div className="flex flex-col gap-lg">
      <div className="flex items-center justify-between gap-lg">
        <div>
          <h2 className="font-display text-h4 text-ink">Staff</h2>
          <p className="mt-1 font-sans text-sm text-muted">People who can sign in to this dashboard.</p>
        </div>
        {canWrite ? (
          <Button variant="primary" size="sm" onClick={startCreate}>
            New staff
          </Button>
        ) : null}
      </div>

      <div className="overflow-hidden rounded border border-line bg-surface">
        {loading ? <p className="px-lg py-lg font-sans text-sm text-muted">Loading staff…</p> : null}
        {!loading && staffLoaded && staff.length === 0 ? (
          <p className="px-lg py-lg font-sans text-sm text-muted">No staff yet.</p>
        ) : null}
        {staff.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-left">
              <thead>
                <tr className="border-b border-line bg-wash">
                  {['Name', 'Email', 'Role', 'Status', 'Last sign-in', 'Actions'].map((heading) => (
                    <th
                      key={heading}
                      className={`px-lg py-3 font-sans text-xs font-medium uppercase tracking-wide text-muted ${heading === 'Actions' ? 'text-right' : ''}`}
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {staff.map((person) => {
                  const isSelf = person.id === user?.id
                  return (
                    <tr key={person.id} className="border-b border-line last:border-b-0">
                      <td className="px-lg py-3 font-sans text-sm font-medium text-ink">{person.name}</td>
                      <td className="px-lg py-3 font-sans text-sm text-copy">{person.email}</td>
                      <td className="px-lg py-3 font-sans text-sm text-copy">
                        {person.roles.length > 0 ? person.roles.map((role) => role.name).join(', ') : '—'}
                      </td>
                      <td className="px-lg py-3">
                        <span
                          className={`rounded-full px-2 py-0.5 font-sans text-xs font-medium ${
                            person.status === 'active' ? 'bg-gold/15 text-gold-link' : 'bg-wash text-muted'
                          }`}
                        >
                          {person.status === 'active' ? 'Active' : 'Disabled'}
                        </span>
                      </td>
                      <td className="px-lg py-3 font-sans text-sm text-copy">{formatWhen(person.lastLoginAt)}</td>
                      <td className="px-lg py-3">
                        <div className="flex justify-end gap-sm">
                          <ActionIcon label={`View ${person.name}`} onClick={() => openPerson(person, 'view')}>
                            <EyeIcon />
                          </ActionIcon>
                          {canWrite ? (
                            <ActionIcon label={`Edit ${person.name}`} onClick={() => openPerson(person, 'edit')}>
                              <PencilIcon />
                            </ActionIcon>
                          ) : null}
                          {canWrite && !isSelf ? (
                            <ActionIcon label={`Delete ${person.name}`} onClick={() => setRemoving(person)}>
                              <TrashIcon />
                            </ActionIcon>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>

      {formOpen ? (
        <SidePanel
          title={mode === 'create' ? 'New staff' : mode === 'view' ? 'View staff' : 'Edit staff'}
          titleId="staff-dialog-title"
          pending={saving}
          widthClass="max-w-lg"
          onClose={closeForm}
          footer={
            <>
              <Button variant="secondary" size="sm" disabled={saving} onClick={closeForm}>
                {mode === 'view' ? 'Close' : 'Cancel'}
              </Button>
              {mode === 'view' && canWrite && selected ? (
                <Button size="sm" onClick={() => openPerson(selected, 'edit')}>
                  Edit
                </Button>
              ) : null}
              {mode !== 'view' && canWrite ? (
                <Button type="submit" form="staffForm" size="sm" disabled={saving || !formReady}>
                  Save
                </Button>
              ) : null}
            </>
          }
        >
          <form id="staffForm" className="grid grid-cols-1 gap-lg" onSubmit={(event) => void saveStaff(event)}>
            <TextField
              id="staffFirstName"
              label="First name"
              value={draft.firstName}
              disabled={readOnly}
              onChange={(event) => setDraft((current) => ({ ...current, firstName: event.target.value }))}
              required
            />
            <TextField
              id="staffLastName"
              label="Last name"
              value={draft.lastName}
              disabled={readOnly}
              onChange={(event) => setDraft((current) => ({ ...current, lastName: event.target.value }))}
              required
            />
            <TextField
              id="staffEmail"
              label="Email"
              type="email"
              autoComplete="off"
              value={draft.email}
              disabled={readOnly}
              onChange={(event) => setDraft((current) => ({ ...current, email: event.target.value }))}
              required
            />
            {mode !== 'view' && canWrite ? (
              <TextField
                id="staffPassword"
                label="Password"
                type="password"
                autoComplete="new-password"
                minLength={mode === 'create' ? 8 : undefined}
                value={draft.password}
                placeholder={mode === 'create' ? 'At least 8 characters' : 'Leave blank to keep the current password'}
                onChange={(event) => setDraft((current) => ({ ...current, password: event.target.value }))}
                required={mode === 'create'}
              />
            ) : null}
            {mode === 'edit' && editingSelf ? null : (
              <div>
                <label htmlFor="staffStatus" className="mb-1.5 block font-sans text-sm font-medium text-copy">
                  Status
                </label>
                <select
                  id="staffStatus"
                  className={controlClass}
                  value={draft.status}
                  disabled={readOnly}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, status: event.target.value as Draft['status'] }))
                  }
                >
                  <option value="active">Active</option>
                  <option value="disabled">Disabled</option>
                </select>
              </div>
            )}
            <fieldset>
              <legend className="mb-1.5 font-sans text-xs font-medium uppercase tracking-wide text-muted">Roles</legend>
              {roles.length > 0 ? (
                <div className="grid grid-cols-1 gap-md rounded border border-line p-3 sm:grid-cols-2">
                  {roles.map((role) => (
                    <CheckOption
                      key={role.id}
                      checked={draft.roleIds.includes(role.id)}
                      disabled={readOnly}
                      onChange={() => toggleRole(role.id)}
                      label={role.name}
                      detail={role.slug}
                    />
                  ))}
                </div>
              ) : null}
            </fieldset>
          </form>
        </SidePanel>
      ) : null}

      {removing ? (
        <ConfirmDialog
          titleId="delete-staff-title"
          title="Delete this staff member?"
          detail={`${removing.name} will no longer be able to sign in.`}
          confirmLabel="Delete"
          pending={saving}
          onCancel={() => {
            if (!saving) setRemoving(null)
          }}
          onConfirm={() => void removeStaff()}
        />
      ) : null}
    </div>
  )
}
