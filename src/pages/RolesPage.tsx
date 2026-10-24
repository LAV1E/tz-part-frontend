import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { toast } from 'sonner'

import { api, errorMessage } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { Button } from '../components/Button'
import { CheckOption } from '../components/CheckOption'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { SidePanel } from '../components/SidePanel'
import { TextField } from '../components/TextField'

type Permission = {
  id: string
  key: string
  description: string | null
}

type Role = {
  id: string
  name: string
  slug: string
  description: string | null
  isSystem: boolean
  permissions: Permission[]
  createdAt: string
  updatedAt: string
}

type Draft = {
  name: string
  description: string
  permissionIds: string[]
}

const emptyDraft: Draft = { name: '', description: '', permissionIds: [] }

function groupPrefix(key: string): string {
  const action = key.lastIndexOf('.')
  return action === -1 ? key : key.slice(0, action)
}

function groupLabel(prefix: string): string {
  return prefix
    .split(/[.-]/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function draftFrom(role: Role): Draft {
  return {
    name: role.name,
    description: role.description ?? '',
    permissionIds: role.permissions.map((permission) => permission.id),
  }
}

export function RolesPage() {
  const { user } = useAuth()
  const canWrite = (user?.permissions ?? []).includes('dashboard.roles.write')
  const [roles, setRoles] = useState<Role[]>([])
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [draft, setDraft] = useState<Draft>(emptyDraft)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [rolesLoaded, setRolesLoaded] = useState(false)

  const selected = roles.find((role) => role.id === selectedId) ?? null
  const locked = Boolean(selected?.isSystem) && !creating
  const groups = useMemo(() => {
    const grouped = new Map<string, Permission[]>()
    for (const permission of permissions) {
      const prefix = groupPrefix(permission.key)
      const list = grouped.get(prefix) ?? []
      list.push(permission)
      grouped.set(prefix, list)
    }
    return [...grouped.entries()]
      .map(([prefix, items]) => ({
        prefix,
        label: groupLabel(prefix),
        items: [...items].sort((a, b) => a.key.localeCompare(b.key)),
      }))
      .sort((a, b) => a.label.localeCompare(b.label))
  }, [permissions])

  useEffect(() => {
    let cancelled = false
    Promise.allSettled([api<Role[]>('/api/dashboard/roles'), api<Permission[]>('/api/dashboard/permissions')])
      .then(([roleResult, permissionResult]) => {
        if (cancelled) return
        if (roleResult.status === 'fulfilled') {
          setRoles(roleResult.value.data)
          setRolesLoaded(true)
        } else {
          toast.error(errorMessage(roleResult.reason))
        }
        if (permissionResult.status === 'fulfilled') {
          setPermissions(permissionResult.value.data)
        } else {
          toast.error(errorMessage(permissionResult.reason))
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  function selectRole(role: Role) {
    setCreating(false)
    setSelectedId(role.id)
    setDraft(draftFrom(role))
    setConfirmingDelete(false)
  }

  function startCreate() {
    setCreating(true)
    setSelectedId(null)
    setDraft(emptyDraft)
    setConfirmingDelete(false)
  }

  function closePanel() {
    if (saving || confirmingDelete) return
    setCreating(false)
    setSelectedId(null)
    setConfirmingDelete(false)
  }

  function togglePermission(id: string) {
    setDraft((current) => ({
      ...current,
      permissionIds: current.permissionIds.includes(id)
        ? current.permissionIds.filter((item) => item !== id)
        : [...current.permissionIds, id],
    }))
  }

  async function saveRole(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    const description = draft.description.trim() || null
    try {
      if (creating) {
        const result = await api<Role>('/api/dashboard/roles', {
          body: { name: draft.name.trim(), description, permissionIds: draft.permissionIds },
        })
        setRoles((current) => [...current, result.data].sort((a, b) => a.name.localeCompare(b.name)))
        setCreating(false)
        setSelectedId(null)
        toast.success('Role created.')
      } else if (selected) {
        const result = await api<Role>(`/api/dashboard/roles/${selected.id}`, {
          method: 'PATCH',
          body: selected.isSystem
            ? { permissionIds: draft.permissionIds }
            : { name: draft.name.trim(), description, permissionIds: draft.permissionIds },
        })
        setRoles((current) =>
          current.map((role) => (role.id === result.data.id ? result.data : role)).sort((a, b) => a.name.localeCompare(b.name)),
        )
        setSelectedId(null)
        toast.success('Role saved.')
      }
    } catch (caught) {
      toast.error(errorMessage(caught))
    } finally {
      setSaving(false)
    }
  }

  async function removeRole() {
    if (!selected) return
    setSaving(true)
    try {
      await api<undefined>(`/api/dashboard/roles/${selected.id}`, { method: 'DELETE' })
      const remaining = roles.filter((role) => role.id !== selected.id)
      setRoles(remaining)
      setConfirmingDelete(false)
      setCreating(false)
      setSelectedId(null)
      toast.success('Role deleted.')
    } catch (caught) {
      setConfirmingDelete(false)
      toast.error(errorMessage(caught))
    } finally {
      setSaving(false)
    }
  }

  const panelOpen = creating || selected !== null
  const nameReady = draft.name.trim().length > 0

  return (
    <section className="overflow-hidden rounded border border-line bg-surface">
      <div className="flex items-center justify-between gap-lg border-b border-line px-lg py-3">
        <div>
          <h2 className="font-display text-h4 text-ink">Roles</h2>
          <p className="mt-1 font-sans text-sm text-muted">
            System roles keep their names. Their permissions can still be changed.
          </p>
        </div>
        {canWrite ? (
          <Button variant="primary" size="sm" onClick={startCreate}>
            New role
          </Button>
        ) : null}
      </div>

      {loading ? <p className="px-lg py-lg font-sans text-sm text-muted">Loading roles…</p> : null}
      {!loading && rolesLoaded && roles.length === 0 ? (
        <p className="px-lg py-lg font-sans text-sm text-muted">No roles yet.</p>
      ) : null}

      {roles.length > 0 ? (
        <ul>
          {roles.map((role) => {
            const active = !creating && role.id === selectedId
            return (
              <li key={role.id} className="border-b border-line last:border-b-0">
                <button
                  type="button"
                  onClick={() => selectRole(role)}
                  className={`w-full px-lg py-lg text-left ${active ? 'bg-gold/10' : 'hover:bg-ink-wash'}`}
                >
                  <span className="block font-sans text-sm font-medium text-ink">{role.name}</span>
                  <span className="mt-1 flex flex-wrap items-center gap-sm">
                    <span
                      className={`rounded-full px-2 py-0.5 font-sans text-xs font-medium ${
                        role.isSystem ? 'bg-gold/15 text-gold-link' : 'border border-line text-muted'
                      }`}
                    >
                      {role.isSystem ? 'System' : 'Custom'}
                    </span>
                    <span className="font-sans text-xs text-muted">
                      {role.permissions.length} permission{role.permissions.length === 1 ? '' : 's'}
                    </span>
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      ) : null}

      {panelOpen ? (
        <SidePanel
          title={creating ? 'New role' : (selected?.name ?? 'Role')}
          titleId="role-panel-title"
          badge={
            creating ? null : (
              <span
                className={`rounded-full px-2 py-0.5 font-sans text-xs font-medium ${
                  selected?.isSystem ? 'bg-gold/15 text-gold-link' : 'border border-line text-muted'
                }`}
              >
                {selected?.isSystem ? 'System' : 'Custom'}
              </span>
            )
          }
          detail={locked ? "This system role's name is fixed." : undefined}
          pending={saving}
          widthClass="max-w-2xl"
          onClose={closePanel}
          footer={
            canWrite && (creating || selected) ? (
              <>
                {selected && !selected.isSystem && !creating ? (
                  <Button variant="secondary" size="sm" className="mr-auto" disabled={saving} onClick={() => setConfirmingDelete(true)}>
                    Delete
                  </Button>
                ) : null}
                <Button variant="secondary" size="sm" disabled={saving} onClick={closePanel}>
                  Cancel
                </Button>
                <Button type="submit" form="roleForm" size="sm" disabled={saving || !nameReady}>
                  Save
                </Button>
              </>
            ) : (
              <Button variant="secondary" size="sm" onClick={closePanel}>
                Close
              </Button>
            )
          }
        >
          <form id="roleForm" className="flex flex-col gap-lg" onSubmit={(event) => void saveRole(event)}>
            <div className="grid grid-cols-1 gap-lg sm:grid-cols-2">
              <TextField
                id="roleName"
                label="Name"
                labelStyle="caption"
                value={draft.name}
                disabled={locked || !canWrite}
                onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
                required
              />
              <TextField
                id="roleDescription"
                label="Description"
                labelStyle="caption"
                value={draft.description}
                maxLength={300}
                disabled={locked || !canWrite}
                onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))}
              />
            </div>
            <div className="flex flex-col gap-md">
              {groups.map((group) => (
                <section key={group.prefix} className="overflow-hidden rounded border border-line">
                  <h3 className="border-b border-line px-3 py-2 font-sans text-xs font-medium uppercase tracking-wide text-muted">
                    {group.label}
                  </h3>
                  <div className="grid grid-cols-1 gap-md p-3 sm:grid-cols-2">
                    {group.items.map((permission) => (
                      <CheckOption
                        key={permission.id}
                        checked={draft.permissionIds.includes(permission.id)}
                        disabled={!canWrite}
                        onChange={() => togglePermission(permission.id)}
                        label={permission.description || permission.key}
                        detail={permission.key}
                      />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </form>
        </SidePanel>
      ) : null}

      {confirmingDelete && selected ? (
        <ConfirmDialog
          titleId="delete-role-title"
          title="Delete this role?"
          detail={`${selected.name} will be removed. A role that is still assigned to staff cannot be deleted.`}
          confirmLabel="Delete"
          pending={saving}
          onCancel={() => {
            if (!saving) setConfirmingDelete(false)
          }}
          onConfirm={() => void removeRole()}
        />
      ) : null}
    </section>
  )
}
