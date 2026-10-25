import { useEffect, useLayoutEffect, useRef, useState, type FormEvent, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from 'react'
import { Link, useParams } from 'react-router-dom'
import { toast } from 'sonner'

import { api, errorMessage } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { Button } from '../components/Button'
import { TextField } from '../components/TextField'

type CompanyStatus = 'pending_review' | 'information_requested' | 'approved' | 'rejected' | 'suspended'

type CompanySummary = {
  id: string
  name: string
  contactName: string
  email: string
  phone: string
  status: CompanyStatus
  businessType: string
  taxId: string
  exemptionStatus: string
  createdAt: string
}

type Address = {
  line1: string
  line2: string | null
  city: string
  state: string
  postalCode: string
  country: string
}

type AddressForm = {
  line1: string
  line2: string
  city: string
  state: string
  postalCode: string
  country: string
}

type Member = {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string | null
  role: 'owner' | 'admin' | 'member'
  status: 'active' | 'disabled'
  passwordSet: boolean
}

type CompanyDetail = CompanySummary & {
  contactFirstName: string
  contactLastName: string
  staffNote: string | null
  creditStatus: 'not_granted'
  canEdit: boolean
  addresses: { billing: Address | null; shipping: Address | null }
  certificate: { originalName: string; mimeType: string; sizeBytes: number } | null
  duplicates: { id: string; name: string; email: string; match: string }[]
  members: Member[]
}

type EditDraft = {
  companyName: string
  firstName: string
  lastName: string
  phone: string
  taxId: string
  businessType: string
  billing: AddressForm
  shipping: AddressForm
}

type UserDraft = {
  firstName: string
  lastName: string
  email: string
  phone: string
  role: 'admin' | 'member'
}

const STATUS_LABELS: Record<CompanyStatus, string> = {
  pending_review: 'Pending review',
  information_requested: 'Information requested',
  approved: 'Approved',
  rejected: 'Rejected',
  suspended: 'Suspended',
}

const TYPE_LABELS: Record<string, string> = {
  repair_shop: 'Repair shop',
  fleet: 'Fleet',
  dealership: 'Dealership',
  reseller: 'Reseller',
  other: 'Other',
}

const ROLE_LABELS: Record<Member['role'], string> = {
  owner: 'Owner',
  admin: 'Admin',
  member: 'Member',
}

const controlClass =
  'h-[42px] w-full rounded border border-line bg-white px-3.5 font-sans text-sm text-copy outline-none hover:border-ink focus:border-gold focus:shadow-focus'

const compactControlClass =
  'box-border h-9 w-full rounded border border-line bg-white px-2.5 py-0 font-sans text-sm leading-none text-copy outline-none hover:border-ink focus:border-gold focus:shadow-focus disabled:cursor-not-allowed disabled:border-line disabled:bg-wash'

const compactAreaClass =
  'box-border h-11 min-h-11 w-full resize-y overflow-auto rounded border border-line bg-white px-2.5 py-1 font-sans text-sm leading-5 text-copy outline-none hover:border-ink focus:border-gold focus:shadow-focus disabled:cursor-not-allowed disabled:border-line disabled:bg-wash'

const emptyUser: UserDraft = { firstName: '', lastName: '', email: '', phone: '', role: 'member' }

type CompanyTab = 'details' | 'addresses' | 'tax' | 'notes' | 'duplicates' | 'users' | 'review'

const TAB_LABELS: Record<CompanyTab, string> = {
  details: 'Details',
  addresses: 'Billing and shipping',
  tax: 'Tax and credit',
  notes: 'Notes',
  duplicates: 'Duplicates',
  users: 'Users',
  review: 'Review',
}

function blankAddress(address: Address | null): AddressForm {
  return {
    line1: address?.line1 ?? '',
    line2: address?.line2 ?? '',
    city: address?.city ?? '',
    state: address?.state ?? '',
    postalCode: address?.postalCode ?? '',
    country: address?.country || 'US',
  }
}

function editFrom(company: CompanyDetail): EditDraft {
  return {
    companyName: company.name,
    firstName: company.contactFirstName,
    lastName: company.contactLastName,
    phone: company.phone,
    taxId: company.taxId,
    businessType: company.businessType,
    billing: blankAddress(company.addresses.billing),
    shipping: blankAddress(company.addresses.shipping),
  }
}

export function CompanyDetailPage() {
  const { id } = useParams()
  const { user } = useAuth()
  const canWrite = user?.permissions.includes('companies.write') ?? false
  const [company, setCompany] = useState<CompanyDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<EditDraft | null>(null)
  const [addingUser, setAddingUser] = useState(false)
  const [userDraft, setUserDraft] = useState<UserDraft>(emptyUser)
  const [tab, setTab] = useState<CompanyTab>('details')
  const [loadedId, setLoadedId] = useState(id)
  const [suspendOpen, setSuspendOpen] = useState(false)
  const [suspendReason, setSuspendReason] = useState('')
  const [suspendError, setSuspendError] = useState('')
  const suspendLock = useRef(false)

  if (id !== loadedId) {
    setLoadedId(id)
    setCompany(null)
    setLoading(Boolean(id))
    setReason('')
    setEditing(false)
    setDraft(null)
    setAddingUser(false)
    setUserDraft(emptyUser)
    setTab('details')
    setSuspendOpen(false)
    setSuspendReason('')
    setSuspendError('')
  }

  useEffect(() => {
    if (!id) return

    let cancelled = false
    api<CompanyDetail>(`/api/dashboard/companies/${id}`)
      .then((result) => {
        if (!cancelled) setCompany(result.data)
      })
      .catch((caught: unknown) => {
        if (!cancelled) toast.error(errorMessage(caught))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [id])

  async function mutate(path: string, options: { method?: string; body?: unknown }, success: string) {
    if (!company) return false
    setSaving(true)
    try {
      const result = await api<CompanyDetail>(`/api/dashboard/companies/${company.id}${path}`, options)
      setCompany(result.data)
      toast.success(result.message || success)
      return true
    } catch (caught: unknown) {
      toast.error(errorMessage(caught))
      return false
    } finally {
      setSaving(false)
    }
  }

  async function saveCompany(event: FormEvent) {
    event.preventDefault()
    if (!draft) return
    const saved = await mutate('', { method: 'PATCH', body: draft }, 'Company updated.')
    if (saved) {
      setEditing(false)
      setDraft(null)
    }
  }

  function closeSuspend() {
    if (saving || suspendLock.current) return
    setSuspendOpen(false)
    setSuspendReason('')
    setSuspendError('')
  }

  async function confirmSuspend(event: FormEvent) {
    event.preventDefault()
    const note = suspendReason.trim()
    if (!note) {
      setSuspendError('Enter a reason for suspension.')
      return
    }
    if (suspendLock.current || saving) return
    suspendLock.current = true
    setSuspendError('')
    try {
      const saved = await mutate('/suspend', { body: { reason: note } }, 'Company suspended.')
      if (saved) {
        setSuspendOpen(false)
        setSuspendReason('')
      }
    } finally {
      suspendLock.current = false
    }
  }

  async function saveUser(event: FormEvent) {
    event.preventDefault()
    const saved = await mutate('/users', { body: userDraft }, 'Invitation sent.')
    if (saved) {
      setAddingUser(false)
      setUserDraft(emptyUser)
    }
  }

  async function openCertificate() {
    if (!company) return
    try {
      const result = await api<{ url: string }>(`/api/dashboard/companies/${company.id}/certificate`)
      window.open(result.data.url, '_blank', 'noopener,noreferrer')
    } catch (caught: unknown) {
      toast.error(errorMessage(caught))
    }
  }

  if (!id) {
    return (
      <div className="flex flex-col gap-lg">
        <BackLink />
        <p className="font-sans text-sm text-muted">This company could not be loaded.</p>
      </div>
    )
  }

  if (loading) {
    return <p className="font-sans text-sm text-muted">Loading company…</p>
  }

  if (!company) {
    return (
      <div className="flex flex-col gap-lg">
        <BackLink />
        <p className="font-sans text-sm text-muted">This company could not be loaded.</p>
      </div>
    )
  }

  const reviewable = company.status === 'pending_review' || company.status === 'information_requested'
  const managed = company.status === 'approved' || company.status === 'suspended'
  const showReview = canWrite && (reviewable || managed)
  const showReviewSection = showReview || (canWrite && (reviewable || company.status === 'approved'))
  const tabs: CompanyTab[] = ['details', 'addresses', 'tax', 'notes']
  if (showReviewSection) tabs.push('review')
  const activeTab = tabs.includes(tab) ? tab : 'details'

  function beginEdit() {
    if (!company) return
    setDraft(editFrom(company))
    setEditing(true)
  }

  return (
    <div className="flex flex-col gap-lg">
      <div className="flex flex-col gap-sm">
        <BackLink />
        <div className="flex flex-col gap-sm sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="font-display text-h2 text-ink">{company.name}</h2>
            <p className="mt-1 font-sans text-sm text-muted">{STATUS_LABELS[company.status]}</p>
          </div>
          {canWrite && !editing ? (
            <button
              type="button"
              disabled={saving}
              onClick={beginEdit}
              className="mt-1 w-fit shrink-0 font-sans text-sm font-medium text-gold-link hover:text-gold-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold disabled:cursor-not-allowed disabled:text-muted"
            >
              Edit company
            </button>
          ) : null}
        </div>
      </div>

      <p className="font-sans text-sm text-copy">Approving this company does not approve tax exemption or credit terms.</p>

      {editing && draft ? (
        <Section title="Edit company">
          <form className="flex flex-col" onSubmit={(event) => void saveCompany(event)}>
            <FormBlock title="Company and contact">
              <CompactField id="companyName" label="Company name" value={draft.companyName} required onChange={(event) => setDraft({ ...draft, companyName: event.target.value })} />
              <div className="grid grid-cols-1 gap-x-3 gap-y-2 sm:grid-cols-2">
                <CompactField id="contactFirst" label="Contact first name" value={draft.firstName} required onChange={(event) => setDraft({ ...draft, firstName: event.target.value })} />
                <CompactField id="contactLast" label="Contact last name" value={draft.lastName} required onChange={(event) => setDraft({ ...draft, lastName: event.target.value })} />
                <CompactField id="contactPhone" label="Phone" value={draft.phone} required onChange={(event) => setDraft({ ...draft, phone: event.target.value })} />
                <CompactField id="taxId" label="EIN / Tax ID" value={draft.taxId} required onChange={(event) => setDraft({ ...draft, taxId: event.target.value })} />
              </div>
              <label className="block">
                <span className="mb-1 block font-sans text-xs font-medium text-copy">Business type</span>
                <select className={compactControlClass} value={draft.businessType} onChange={(event) => setDraft({ ...draft, businessType: event.target.value })}>
                  {Object.entries(TYPE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </label>
            </FormBlock>
            <div className="mt-4 grid grid-cols-1 border-t border-line pt-4 lg:grid-cols-2">
              <FormBlock title="Billing address" className="lg:pr-4">
                <AddressFields idPrefix="billing" value={draft.billing} onChange={(billing) => setDraft({ ...draft, billing })} />
              </FormBlock>
              <FormBlock title="Shipping address" className="mt-4 border-t border-line pt-4 lg:mt-0 lg:border-l lg:border-t-0 lg:pl-4 lg:pt-0">
                <AddressFields idPrefix="shipping" value={draft.shipping} onChange={(shipping) => setDraft({ ...draft, shipping })} />
              </FormBlock>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-sm border-t border-line pt-3">
              <Button type="submit" size="sm" disabled={saving}>Save</Button>
              <Button type="button" variant="secondary" size="sm" disabled={saving} onClick={() => { setEditing(false); setDraft(null) }}>Cancel</Button>
            </div>
          </form>
        </Section>
      ) : (
        <div>
          <div className="-mx-1 overflow-x-auto px-1">
            <div role="tablist" aria-label="Company details" className="flex min-w-max gap-xs border-b border-line">
              {tabs.map((item) => {
                const selected = item === activeTab
                return (
                  <button
                    key={item}
                    type="button"
                    role="tab"
                    id={`company-tab-${item}`}
                    aria-selected={selected}
                    aria-controls={`company-panel-${item}`}
                    tabIndex={selected ? 0 : -1}
                    className={`border-b-2 px-md py-sm font-sans text-sm whitespace-nowrap ${selected ? 'border-gold font-medium text-ink' : 'border-transparent text-muted hover:text-ink'}`}
                    onClick={() => setTab(item)}
                  >
                    {TAB_LABELS[item]}
                  </button>
                )
              })}
            </div>
          </div>
          <div role="tabpanel" id={`company-panel-${activeTab}`} aria-labelledby={`company-tab-${activeTab}`} className="pt-lg">
            {activeTab === 'details' ? (
              <DetailTable
                rows={[
                  { label: 'Contact person', value: `${company.contactFirstName} ${company.contactLastName}`.trim() },
                  { label: 'Email', value: company.email },
                  { label: 'Phone', value: company.phone },
                  { label: 'EIN / Tax ID', value: company.taxId },
                  { label: 'Business type', value: TYPE_LABELS[company.businessType] ?? company.businessType },
                ]}
              />
            ) : null}
            {activeTab === 'addresses' ? (
              <DetailTable
                rows={[
                  { label: 'Billing', value: formatAddress(company.addresses.billing) },
                  { label: 'Shipping', value: formatAddress(company.addresses.shipping) },
                ]}
              />
            ) : null}
            {activeTab === 'tax' ? (
              <div className="flex flex-col gap-md">
                <DetailTable
                  rows={[
                    { label: 'Tax exemption', value: labelize(company.exemptionStatus) },
                    { label: 'Credit terms', value: company.creditStatus === 'not_granted' ? 'Not granted' : labelize(company.creditStatus) },
                    {
                      label: 'Certificate',
                      value: company.certificate ? (
                        <button type="button" className="text-left font-sans text-sm font-medium text-gold-link" onClick={() => void openCertificate()}>
                          View certificate ({company.certificate.originalName})
                        </button>
                      ) : (
                        'No tax-exemption certificate.'
                      ),
                    },
                  ]}
                />
                {canWrite && company.exemptionStatus !== 'not_requested' ? (
                  <div className="flex flex-wrap gap-sm">
                    <Button
                      size="sm"
                      disabled={saving || company.exemptionStatus === 'approved'}
                      onClick={() => void mutate('/exemption', { body: { decision: 'approved' } }, 'Tax exemption approved.')}
                    >
                      Approve exemption
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={saving || company.exemptionStatus === 'rejected'}
                      onClick={() => void mutate('/exemption', { body: { decision: 'rejected' } }, 'Tax exemption rejected.')}
                    >
                      Reject exemption
                    </Button>
                  </div>
                ) : null}
              </div>
            ) : null}
            {activeTab === 'notes' ? (
              <DetailTable rows={[{ label: 'Latest note', value: company.staffNote ?? '' }]} />
            ) : null}
            {activeTab === 'duplicates' ? (
              <DataTable
                columns={['Company', 'Email', 'Match']}
                rows={(company.duplicates ?? []).map((match) => [
                  match.name,
                  match.email,
                  `Same ${match.match}`,
                ])}
                rowKey={(_, index) => {
                  const match = company.duplicates[index]
                  return `${match.id}-${match.match}`
                }}
              />
            ) : null}
            {activeTab === 'users' ? (
              <div className="flex flex-col gap-md">
                {canWrite && !addingUser ? (
                  <div className="flex justify-end">
                    <Button variant="secondary" size="sm" disabled={saving} onClick={() => setAddingUser(true)}>
                      Add user
                    </Button>
                  </div>
                ) : null}
                <DataTable
                  columns={['Name', 'Email', 'Phone', 'Role', 'Status', ...(canWrite ? ['Actions'] : [])]}
                  rows={company.members.map((member) => {
                    const cells: ReactNode[] = [
                      `${member.firstName} ${member.lastName}`.trim(),
                      member.email,
                      member.phone || '—',
                      ROLE_LABELS[member.role],
                      `${member.status === 'active' ? 'Active' : 'Disabled'}${member.passwordSet ? '' : ' · Invite pending'}`,
                    ]
                    if (canWrite) {
                      cells.push(
                        <div className="flex flex-wrap gap-sm">
                          {!member.passwordSet && member.status === 'active' ? (
                            <Button variant="secondary" size="sm" disabled={saving} onClick={() => void mutate(`/users/${member.id}/resend`, { method: 'POST' }, 'Invitation sent.')}>
                              Resend invite
                            </Button>
                          ) : null}
                          {member.role !== 'owner' && member.status === 'active' ? (
                            <Button variant="secondary" size="sm" disabled={saving} onClick={() => void mutate(`/users/${member.id}/make-owner`, { method: 'POST' }, 'Owner updated.')}>
                              Make owner
                            </Button>
                          ) : null}
                          {member.status === 'active' ? (
                            <Button variant="secondary" size="sm" disabled={saving} onClick={() => void mutate(`/users/${member.id}/disable`, { method: 'POST' }, 'User disabled.')}>
                              Disable
                            </Button>
                          ) : (
                            <Button variant="secondary" size="sm" disabled={saving} onClick={() => void mutate(`/users/${member.id}/enable`, { method: 'POST' }, 'User enabled.')}>
                              Enable
                            </Button>
                          )}
                          {member.role !== 'owner' ? (
                            <Button variant="secondary" size="sm" disabled={saving} onClick={() => void mutate(`/users/${member.id}`, { method: 'DELETE' }, 'Removed from this company.')}>
                              Remove
                            </Button>
                          ) : null}
                        </div>,
                      )
                    }
                    return cells
                  })}
                  rowKey={(_, index) => company.members[index].id}
                  empty="No users for this company."
                />
                {canWrite && addingUser ? (
                  <form className="grid grid-cols-1 gap-md rounded border border-line bg-surface p-md sm:grid-cols-2" onSubmit={(event) => void saveUser(event)}>
                    <TextField id="userFirst" label="First name" value={userDraft.firstName} required onChange={(event) => setUserDraft({ ...userDraft, firstName: event.target.value })} />
                    <TextField id="userLast" label="Last name" value={userDraft.lastName} required onChange={(event) => setUserDraft({ ...userDraft, lastName: event.target.value })} />
                    <TextField id="userEmail" label="Email" type="email" value={userDraft.email} required onChange={(event) => setUserDraft({ ...userDraft, email: event.target.value })} />
                    <TextField id="userPhone" label="Phone" value={userDraft.phone} required onChange={(event) => setUserDraft({ ...userDraft, phone: event.target.value })} />
                    <label className="block sm:col-span-2">
                      <span className="mb-1.5 block font-sans text-sm font-medium text-copy">Role</span>
                      <select className={controlClass} value={userDraft.role} onChange={(event) => setUserDraft({ ...userDraft, role: event.target.value as UserDraft['role'] })}>
                        <option value="member">Member</option>
                        <option value="admin">Admin</option>
                      </select>
                    </label>
                    <div className="flex flex-wrap gap-sm sm:col-span-2">
                      <Button type="submit" size="sm" disabled={saving}>Send invite</Button>
                      <Button type="button" variant="secondary" size="sm" disabled={saving} onClick={() => { setAddingUser(false); setUserDraft(emptyUser) }}>Cancel</Button>
                    </div>
                  </form>
                ) : null}
              </div>
            ) : null}
            {activeTab === 'review' ? (
              <div className="flex flex-col gap-md">
                <DetailTable rows={[{ label: 'Status', value: STATUS_LABELS[company.status] }]} />
                {canWrite && reviewable ? (
                  <label className="block font-sans text-sm text-copy">
                    <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted">Reason</span>
                    <textarea
                      value={reason}
                      onChange={(event) => setReason(event.target.value)}
                      rows={4}
                      className="w-full rounded border border-line bg-surface px-3.5 py-2.5 text-sm text-copy"
                      placeholder="Required to reject or request information"
                    />
                  </label>
                ) : null}
                {showReview ? (
                  <div className="flex flex-wrap gap-sm">
                    {reviewable ? (
                      <>
                        <Button size="sm" disabled={saving} onClick={() => void mutate('/approve', { method: 'POST' }, 'Company approved.')}>
                          Approve
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          disabled={saving || reason.trim().length === 0}
                          onClick={() => void mutate('/request-information', { body: { reason } }, 'Information requested.')}
                        >
                          Request information
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          disabled={saving || reason.trim().length === 0}
                          onClick={() => void mutate('/reject', { body: { reason } }, 'Company rejected.')}
                        >
                          Reject
                        </Button>
                      </>
                    ) : null}
                    {company.status === 'approved' ? (
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={saving}
                        onClick={() => {
                          setSuspendReason('')
                          setSuspendError('')
                          setSuspendOpen(true)
                        }}
                      >
                        Suspend company
                      </Button>
                    ) : null}
                    {company.status === 'suspended' ? (
                      <Button size="sm" disabled={saving} onClick={() => void mutate('/reinstate', {}, 'Company reinstated.')}>
                        Reinstate
                      </Button>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      )}
      {suspendOpen ? (
        <SuspendDialog
          reason={suspendReason}
          error={suspendError}
          pending={saving}
          onReasonChange={(value) => {
            setSuspendReason(value)
            if (suspendError) setSuspendError('')
          }}
          onCancel={closeSuspend}
          onConfirm={(event) => void confirmSuspend(event)}
        />
      ) : null}
    </div>
  )
}

function SuspendDialog({
  reason,
  error,
  pending,
  onReasonChange,
  onCancel,
  onConfirm,
}: {
  reason: string
  error: string
  pending: boolean
  onReasonChange: (value: string) => void
  onCancel: () => void
  onConfirm: (event: FormEvent) => void
}) {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !pending) onCancel()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onCancel, pending])

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label="Close dialog"
        disabled={pending}
        onClick={onCancel}
      />
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="suspend-company-title"
        className="relative w-full max-w-md rounded border border-line bg-surface p-lg"
        onSubmit={onConfirm}
      >
        <h2 id="suspend-company-title" className="font-display text-h3 text-ink">
          Suspend company
        </h2>
        <p className="mt-sm font-sans text-sm text-muted">
          Wholesale access stops until a staff member reinstates this company. The reason is saved on the company and in its status history.
        </p>
        <label htmlFor="suspend-reason" className="mt-lg block">
          <span className="mb-1.5 block font-sans text-sm font-medium text-copy">Reason for suspension</span>
          <textarea
            id="suspend-reason"
            value={reason}
            rows={4}
            disabled={pending}
            onChange={(event) => onReasonChange(event.target.value)}
            className={`w-full rounded border bg-white px-3.5 py-2.5 font-sans text-sm text-copy outline-none hover:border-ink focus:border-gold focus:shadow-focus disabled:border-line disabled:bg-wash ${error ? 'border-error' : 'border-line'}`}
          />
          {error ? <p className="mt-1 font-sans text-xs text-error">{error}</p> : null}
        </label>
        <div className="mt-lg flex justify-end gap-sm">
          <Button variant="secondary" disabled={pending} onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? 'Suspending…' : 'Suspend company'}
          </Button>
        </div>
      </form>
    </div>
  )
}

function BackLink() {
  return (
    <Link to="/sales/companies" className="w-fit font-sans text-sm font-medium text-gold-link hover:text-gold-hover">
      ← Companies
    </Link>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded border border-line bg-surface px-4 py-3">
      <h3 className="font-display text-sm font-semibold text-ink">{title}</h3>
      <div className="mt-3">{children}</div>
    </section>
  )
}

function CompactField({ id, label, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="mb-1 block font-sans text-xs font-medium text-copy">
        {label}
      </label>
      <input id={id} className={compactControlClass} {...props} />
    </div>
  )
}

function CompactArea({ id, label, value, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string }) {
  const ref = useRef<HTMLTextAreaElement>(null)
  useLayoutEffect(() => {
    const element = ref.current
    if (!element) return
    element.style.height = '44px'
    if (element.scrollHeight > element.clientHeight + 1) element.style.height = `${element.scrollHeight}px`
  }, [value])
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="mb-1 block font-sans text-xs font-medium text-copy">
        {label}
      </label>
      <textarea id={id} ref={ref} rows={1} value={value} className={compactAreaClass} {...props} />
    </div>
  )
}

function FormBlock({ title, children, className = '' }: { title: string; children: ReactNode; className?: string }) {
  return (
    <section className={className}>
      <h4 className="mb-1.5 font-sans text-xs font-medium uppercase tracking-wide text-muted">{title}</h4>
      <div className="flex flex-col gap-2">{children}</div>
    </section>
  )
}

function AddressFields({
  idPrefix,
  value,
  onChange,
}: {
  idPrefix: string
  value: AddressForm
  onChange: (next: AddressForm) => void
}) {
  const set = (key: keyof AddressForm) => (event: { target: { value: string } }) => onChange({ ...value, [key]: event.target.value })
  return (
    <div className="grid min-w-0 grid-cols-1 gap-x-3 gap-y-2 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <CompactArea id={`${idPrefix}-line1`} label="Address" value={value.line1} required onChange={set('line1')} />
      </div>
      <div className="sm:col-span-2">
        <CompactArea id={`${idPrefix}-line2`} label="Address line 2" value={value.line2} onChange={set('line2')} />
      </div>
      <CompactField id={`${idPrefix}-city`} label="City" value={value.city} required onChange={set('city')} />
      <CompactField id={`${idPrefix}-state`} label="State" value={value.state} required onChange={set('state')} />
      <CompactField id={`${idPrefix}-postal`} label="Postal code" value={value.postalCode} required onChange={set('postalCode')} />
      <CompactField id={`${idPrefix}-country`} label="Country" value={value.country} required onChange={set('country')} />
    </div>
  )
}

function displayValue(value: ReactNode) {
  if (value === null || value === undefined || value === '') return '—'
  return value
}

function DetailTable({ rows }: { rows: { label: string; value: ReactNode }[] }) {
  return (
    <div className="overflow-x-auto rounded border border-line bg-surface">
      <table className="w-full min-w-[280px] border-collapse text-left">
        <tbody>
          {rows.map((row) => (
            <tr key={row.label} className="border-b border-line last:border-b-0">
              <th scope="row" className="w-2/5 min-w-[140px] bg-wash px-md py-3 align-top font-sans text-xs font-medium uppercase tracking-wide text-muted sm:w-1/3">
                {row.label}
              </th>
              <td className="px-md py-3 font-sans text-sm text-copy">{displayValue(row.value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function DataTable({
  columns,
  rows,
  rowKey,
  empty = 'Nothing to show.',
}: {
  columns: string[]
  rows: ReactNode[][]
  rowKey: (row: ReactNode[], index: number) => string
  empty?: string
}) {
  return (
    <div className="overflow-x-auto rounded border border-line bg-surface">
      <table className="w-full min-w-[640px] border-collapse text-left">
        <thead>
          <tr className="border-b border-line bg-wash">
            {columns.map((column) => (
              <th key={column} className="px-md py-3 font-sans text-xs font-medium uppercase tracking-wide text-muted">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-md py-lg font-sans text-sm text-muted">
                {empty}
              </td>
            </tr>
          ) : (
            rows.map((row, index) => (
              <tr key={rowKey(row, index)} className="border-b border-line last:border-b-0">
                {row.map((cell, cellIndex) => (
                  <td key={columns[cellIndex]} className="px-md py-3 align-top font-sans text-sm text-copy">
                    {displayValue(cell)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}

function formatAddress(address: Address | null) {
  if (!address) return '—'
  return [address.line1, address.line2, `${address.city}, ${address.state} ${address.postalCode}`, address.country]
    .filter(Boolean)
    .join(', ')
}

function labelize(value: string) {
  return value.replaceAll('_', ' ')
}
