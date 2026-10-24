import { useEffect, useState, type FormEvent } from 'react'
import { toast } from 'sonner'

import { api, errorMessage } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { Button } from '../components/Button'
import { SidePanel } from '../components/SidePanel'
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

const emptyUser: UserDraft = { firstName: '', lastName: '', email: '', phone: '', role: 'member' }

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

export function CompaniesPage() {
  const { user } = useAuth()
  const canWrite = user?.permissions.includes('companies.write') ?? false
  const [companies, setCompanies] = useState<CompanySummary[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<CompanyDetail | null>(null)
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<EditDraft | null>(null)
  const [addingUser, setAddingUser] = useState(false)
  const [userDraft, setUserDraft] = useState<UserDraft>(emptyUser)

  useEffect(() => {
    let cancelled = false
    api<CompanySummary[]>('/api/dashboard/companies')
      .then((result) => {
        if (!cancelled) setCompanies(result.data)
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
  }, [])

  function remember(detail: CompanyDetail) {
    setSelected(detail)
    setCompanies((current) =>
      current.map((company) =>
        company.id === detail.id
          ? {
              ...company,
              name: detail.name,
              contactName: `${detail.contactFirstName} ${detail.contactLastName}`.trim(),
              email: detail.email,
              phone: detail.phone,
              status: detail.status,
              businessType: detail.businessType,
              taxId: detail.taxId,
              exemptionStatus: detail.exemptionStatus,
            }
          : company
      )
    )
  }

  async function openCompany(id: string) {
    setSaving(true)
    try {
      const result = await api<CompanyDetail>(`/api/dashboard/companies/${id}`)
      remember(result.data)
      setReason('')
      setEditing(false)
      setDraft(null)
      setAddingUser(false)
      setUserDraft(emptyUser)
    } catch (caught: unknown) {
      toast.error(errorMessage(caught))
    } finally {
      setSaving(false)
    }
  }

  async function mutate(path: string, options: { method?: string; body?: unknown }, success: string) {
    if (!selected) return false
    setSaving(true)
    try {
      const result = await api<CompanyDetail>(`/api/dashboard/companies/${selected.id}${path}`, options)
      remember(result.data)
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

  async function saveUser(event: FormEvent) {
    event.preventDefault()
    const saved = await mutate('/users', { body: userDraft }, 'Invitation sent.')
    if (saved) {
      setAddingUser(false)
      setUserDraft(emptyUser)
    }
  }

  async function openCertificate() {
    if (!selected) return
    try {
      const result = await api<{ url: string }>(`/api/dashboard/companies/${selected.id}/certificate`)
      window.open(result.data.url, '_blank', 'noopener,noreferrer')
    } catch (caught: unknown) {
      toast.error(errorMessage(caught))
    }
  }

  const reviewable = selected?.status === 'pending_review' || selected?.status === 'information_requested'
  const managed = selected?.status === 'approved' || selected?.status === 'suspended'

  return (
    <div className="flex flex-col gap-lg">
      <div>
        <h2 className="font-display text-h4 text-ink">Companies</h2>
        <p className="mt-1 font-sans text-sm text-muted">Wholesale applications that have verified their email.</p>
      </div>
      <div className="overflow-hidden rounded border border-line bg-surface">
        {loading ? <p className="px-lg py-lg font-sans text-sm text-muted">Loading companies…</p> : null}
        {!loading && companies.length === 0 ? (
          <p className="px-lg py-lg font-sans text-sm text-muted">No applications yet.</p>
        ) : null}
        {companies.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-left">
              <thead>
                <tr className="border-b border-line bg-wash">
                  {['Company', 'Contact', 'Status', 'Business type', ''].map((label) => (
                    <th key={label} className="px-lg py-3 font-sans text-xs font-medium uppercase tracking-wide text-muted">
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {companies.map((company) => (
                  <tr key={company.id} className="border-b border-line last:border-b-0">
                    <td className="px-lg py-3 font-sans text-sm font-medium text-ink">{company.name}</td>
                    <td className="px-lg py-3 font-sans text-sm text-copy">
                      {company.contactName}
                      <span className="mt-0.5 block text-xs text-muted">{company.email}</span>
                    </td>
                    <td className="px-lg py-3 font-sans text-sm text-copy">{STATUS_LABELS[company.status]}</td>
                    <td className="px-lg py-3 font-sans text-sm text-copy">{TYPE_LABELS[company.businessType] ?? company.businessType}</td>
                    <td className="px-lg py-3 text-right">
                      <Button variant="secondary" size="sm" onClick={() => void openCompany(company.id)}>
                        View
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>

      {selected ? (
        <SidePanel
          title={selected.name}
          titleId="company-panel-title"
          pending={saving}
          widthClass="max-w-3xl"
          onClose={() => {
            if (!saving) setSelected(null)
          }}
          detail={STATUS_LABELS[selected.status]}
          footer={
            canWrite && (reviewable || managed) ? (
              <div className="flex flex-wrap justify-end gap-sm">
                {reviewable ? (
                  <>
                    <Button size="sm" disabled={saving} onClick={() => void mutate('/approve', {}, 'Company approved.')}>
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
                {selected.status === 'approved' ? (
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={saving || reason.trim().length === 0}
                    onClick={() => void mutate('/suspend', { body: { reason } }, 'Company suspended.')}
                  >
                    Suspend
                  </Button>
                ) : null}
                {selected.status === 'suspended' ? (
                  <Button size="sm" disabled={saving} onClick={() => void mutate('/reinstate', {}, 'Company reinstated.')}>
                    Reinstate
                  </Button>
                ) : null}
              </div>
            ) : null
          }
        >
          <div className="flex flex-col gap-lg font-sans text-sm text-copy">
            <p>Approving this company does not approve tax exemption or credit terms.</p>
            {editing && draft ? (
              <form className="flex flex-col gap-md" onSubmit={(event) => void saveCompany(event)}>
                <TextField id="companyName" label="Company name" value={draft.companyName} required onChange={(event) => setDraft({ ...draft, companyName: event.target.value })} />
                <div className="grid grid-cols-1 gap-md sm:grid-cols-2">
                  <TextField id="contactFirst" label="Contact first name" value={draft.firstName} required onChange={(event) => setDraft({ ...draft, firstName: event.target.value })} />
                  <TextField id="contactLast" label="Contact last name" value={draft.lastName} required onChange={(event) => setDraft({ ...draft, lastName: event.target.value })} />
                  <TextField id="contactPhone" label="Phone" value={draft.phone} required onChange={(event) => setDraft({ ...draft, phone: event.target.value })} />
                  <TextField id="taxId" label="EIN / Tax ID" value={draft.taxId} required onChange={(event) => setDraft({ ...draft, taxId: event.target.value })} />
                </div>
                <label className="block">
                  <span className="mb-1.5 block font-sans text-sm font-medium text-copy">Business type</span>
                  <select className={controlClass} value={draft.businessType} onChange={(event) => setDraft({ ...draft, businessType: event.target.value })}>
                    {Object.entries(TYPE_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </label>
                <AddressEditor title="Billing address" idPrefix="billing" value={draft.billing} onChange={(billing) => setDraft({ ...draft, billing })} />
                <AddressEditor title="Shipping address" idPrefix="shipping" value={draft.shipping} onChange={(shipping) => setDraft({ ...draft, shipping })} />
                <div className="flex gap-sm">
                  <Button type="submit" size="sm" disabled={saving}>Save</Button>
                  <Button type="button" variant="secondary" size="sm" disabled={saving} onClick={() => { setEditing(false); setDraft(null) }}>Cancel</Button>
                </div>
              </form>
            ) : (
              <>
                {canWrite ? (
                  <div>
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={saving}
                      onClick={() => {
                        setDraft(editFrom(selected))
                        setEditing(true)
                      }}
                    >
                      Edit company
                    </Button>
                  </div>
                ) : null}
                <dl className="grid grid-cols-1 gap-md sm:grid-cols-2">
                  <Field label="Contact" value={`${selected.contactFirstName} ${selected.contactLastName}`} />
                  <Field label="Email" value={selected.email} />
                  <Field label="Phone" value={selected.phone} />
                  <Field label="EIN / Tax ID" value={selected.taxId} />
                  <Field label="Business type" value={TYPE_LABELS[selected.businessType] ?? selected.businessType} />
                  <Field label="Tax exemption" value={labelize(selected.exemptionStatus)} />
                  <Field label="Credit terms" value="Not granted" />
                  <Field label="Billing" value={formatAddress(selected.addresses.billing)} />
                  <Field label="Shipping" value={formatAddress(selected.addresses.shipping)} />
                </dl>
              </>
            )}
            {selected.certificate ? (
              <button type="button" className="text-left font-medium text-gold-link" onClick={() => void openCertificate()}>
                View certificate ({selected.certificate.originalName})
              </button>
            ) : (
              <p className="text-muted">No tax-exemption certificate.</p>
            )}
            {canWrite && selected.exemptionStatus !== 'not_requested' ? (
              <div className="flex flex-wrap gap-sm">
                <Button
                  size="sm"
                  disabled={saving || selected.exemptionStatus === 'approved'}
                  onClick={() => void mutate('/exemption', { body: { decision: 'approved' } }, 'Tax exemption approved.')}
                >
                  Approve exemption
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={saving || selected.exemptionStatus === 'rejected'}
                  onClick={() => void mutate('/exemption', { body: { decision: 'rejected' } }, 'Tax exemption rejected.')}
                >
                  Reject exemption
                </Button>
              </div>
            ) : null}
            {(selected.duplicates ?? []).length > 0 ? (
              <div className="rounded border border-line p-3">
                <p className="font-medium text-ink">Possible duplicates</p>
                <ul className="mt-2 space-y-1">
                  {selected.duplicates.map((match) => (
                    <li key={`${match.id}-${match.match}`}>
                      {match.name} · {match.email} · same {match.match}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {selected.staffNote ? <p>Latest note: {selected.staffNote}</p> : null}
            {canWrite && (reviewable || selected.status === 'approved') ? (
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted">Reason</span>
                <textarea
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  rows={4}
                  className="w-full rounded border border-line px-3.5 py-2.5 text-sm text-copy"
                  placeholder={reviewable ? 'Required to reject or request information' : 'Required to suspend'}
                />
              </label>
            ) : null}
            {managed ? (
              <section className="flex flex-col gap-md">
                <div className="flex items-center justify-between gap-md">
                  <h3 className="font-display text-base text-ink">Users</h3>
                  {canWrite && !addingUser ? (
                    <Button variant="secondary" size="sm" disabled={saving} onClick={() => setAddingUser(true)}>
                      Add user
                    </Button>
                  ) : null}
                </div>
                <ul className="flex flex-col gap-sm">
                  {selected.members.map((member) => (
                    <li key={member.id} className="rounded border border-line p-3">
                      <p className="font-medium text-ink">{member.firstName} {member.lastName}</p>
                      <p className="text-muted">{member.email}</p>
                      <p className="mt-1 text-xs uppercase tracking-wide text-muted">
                        {ROLE_LABELS[member.role]} · {member.status === 'active' ? 'Active' : 'Disabled'}
                        {member.passwordSet ? '' : ' · Invite pending'}
                      </p>
                      {canWrite ? (
                        <div className="mt-2 flex flex-wrap gap-sm">
                          {!member.passwordSet && member.status === 'active' ? (
                            <Button variant="secondary" size="sm" disabled={saving} onClick={() => void mutate(`/users/${member.id}/resend`, {}, 'Invitation sent.')}>
                              Resend invite
                            </Button>
                          ) : null}
                          {member.role !== 'owner' && member.status === 'active' ? (
                            <Button variant="secondary" size="sm" disabled={saving} onClick={() => void mutate(`/users/${member.id}/make-owner`, {}, 'Owner updated.')}>
                              Make owner
                            </Button>
                          ) : null}
                          {member.status === 'active' ? (
                            <Button variant="secondary" size="sm" disabled={saving} onClick={() => void mutate(`/users/${member.id}/disable`, {}, 'User disabled.')}>
                              Disable
                            </Button>
                          ) : (
                            <Button variant="secondary" size="sm" disabled={saving} onClick={() => void mutate(`/users/${member.id}/enable`, {}, 'User enabled.')}>
                              Enable
                            </Button>
                          )}
                          {member.role !== 'owner' ? (
                            <Button variant="secondary" size="sm" disabled={saving} onClick={() => void mutate(`/users/${member.id}`, { method: 'DELETE' }, 'User removed.')}>
                              Remove
                            </Button>
                          ) : null}
                        </div>
                      ) : null}
                    </li>
                  ))}
                </ul>
                {canWrite && addingUser ? (
                  <form className="grid grid-cols-1 gap-md rounded border border-line p-3 sm:grid-cols-2" onSubmit={(event) => void saveUser(event)}>
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
                    <div className="flex gap-sm sm:col-span-2">
                      <Button type="submit" size="sm" disabled={saving}>Send invite</Button>
                      <Button type="button" variant="secondary" size="sm" disabled={saving} onClick={() => { setAddingUser(false); setUserDraft(emptyUser) }}>Cancel</Button>
                    </div>
                  </form>
                ) : null}
              </section>
            ) : null}
          </div>
        </SidePanel>
      ) : null}
    </div>
  )
}

function AddressEditor({
  title,
  idPrefix,
  value,
  onChange,
}: {
  title: string
  idPrefix: string
  value: AddressForm
  onChange: (next: AddressForm) => void
}) {
  const set = (key: keyof AddressForm) => (event: { target: { value: string } }) => onChange({ ...value, [key]: event.target.value })
  return (
    <fieldset className="grid grid-cols-1 gap-md sm:grid-cols-2">
      <legend className="mb-1.5 font-sans text-xs font-medium uppercase tracking-wide text-muted sm:col-span-2">{title}</legend>
      <div className="sm:col-span-2"><TextField id={`${idPrefix}-line1`} label="Address" value={value.line1} required onChange={set('line1')} /></div>
      <div className="sm:col-span-2"><TextField id={`${idPrefix}-line2`} label="Address line 2" value={value.line2} onChange={set('line2')} /></div>
      <TextField id={`${idPrefix}-city`} label="City" value={value.city} required onChange={set('city')} />
      <TextField id={`${idPrefix}-state`} label="State" value={value.state} required onChange={set('state')} />
      <TextField id={`${idPrefix}-postal`} label="Postal code" value={value.postalCode} required onChange={set('postalCode')} />
      <TextField id={`${idPrefix}-country`} label="Country" value={value.country} required onChange={set('country')} />
    </fieldset>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-muted">{label}</dt>
      <dd className="mt-1">{value || '—'}</dd>
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
