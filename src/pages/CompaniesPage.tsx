import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

import { ApiError, api, errorMessage } from '../api/client'
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

type AddressDraft = {
  line1: string
  line2: string
  city: string
  state: string
  postalCode: string
  country: string
}

type CompanyDraft = {
  companyName: string
  firstName: string
  lastName: string
  email: string
  phone: string
  taxId: string
  businessType: string
  billing: AddressDraft
  shipping: AddressDraft
  shippingSameAsBilling: boolean
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

const controlClass =
  'h-[42px] w-full rounded border border-line bg-white px-3.5 font-sans text-sm text-copy outline-none hover:border-ink focus:border-gold focus:shadow-focus'

function blankAddress(): AddressDraft {
  return { line1: '', line2: '', city: '', state: '', postalCode: '', country: 'US' }
}

function blankDraft(): CompanyDraft {
  return {
    companyName: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    taxId: '',
    businessType: 'repair_shop',
    billing: blankAddress(),
    shipping: blankAddress(),
    shippingSameAsBilling: true,
  }
}

function trimAddress(address: AddressDraft): AddressDraft {
  return {
    line1: address.line1.trim(),
    line2: address.line2.trim(),
    city: address.city.trim(),
    state: address.state.trim(),
    postalCode: address.postalCode.trim(),
    country: address.country.trim(),
  }
}

function validateDraft(draft: CompanyDraft): Record<string, string> {
  const errors: Record<string, string> = {}
  const required: Array<[string, string, string]> = [
    ['companyName', draft.companyName, 'Company name'],
    ['firstName', draft.firstName, 'First name'],
    ['lastName', draft.lastName, 'Last name'],
    ['email', draft.email, 'Email'],
    ['phone', draft.phone, 'Phone'],
    ['taxId', draft.taxId, 'EIN / Tax ID'],
  ]
  for (const [key, value, label] of required) {
    if (!value.trim()) errors[key] = `${label} is required.`
  }
  if (draft.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email.trim())) {
    errors.email = 'Enter a valid email address.'
  }
  if (draft.phone.trim() && draft.phone.replace(/\D/g, '').length < 7) {
    errors.phone = 'Phone must include at least 7 digits.'
  }
  if (!TYPE_LABELS[draft.businessType]) errors.businessType = 'Choose a business type.'
  const addresses: Array<['billing' | 'shipping', AddressDraft]> = [['billing', draft.billing]]
  if (!draft.shippingSameAsBilling) addresses.push(['shipping', draft.shipping])
  for (const [prefix, address] of addresses) {
    const fields: Array<[keyof AddressDraft, string]> = [
      ['line1', 'Address'],
      ['city', 'City'],
      ['state', 'State'],
      ['postalCode', 'Postal code'],
      ['country', 'Country'],
    ]
    for (const [key, label] of fields) {
      if (!address[key].trim()) errors[`${prefix}.${key}`] = `${label} is required.`
    }
  }
  return errors
}

function fieldErrorsFromApi(caught: unknown): Record<string, string> {
  if (!(caught instanceof ApiError) || !caught.errors) return {}
  const errors: Record<string, string> = {}
  for (const item of caught.errors) {
    const split = item.indexOf(': ')
    if (split > 0) errors[item.slice(0, split)] = item.slice(split + 2)
  }
  return errors
}

export function CompaniesPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const canWrite = user?.permissions.includes('companies.write') ?? false
  const [companies, setCompanies] = useState<CompanySummary[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [draft, setDraft] = useState<CompanyDraft>(blankDraft)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const submitLock = useRef(false)

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

  function closeForm() {
    if (saving || submitLock.current) return
    setCreating(false)
    setDraft(blankDraft())
    setFieldErrors({})
  }

  async function createCompany(event: FormEvent) {
    event.preventDefault()
    const errors = validateDraft(draft)
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) return
    if (submitLock.current || saving) return
    const billing = trimAddress(draft.billing)
    const shipping = draft.shippingSameAsBilling ? billing : trimAddress(draft.shipping)
    submitLock.current = true
    setSaving(true)
    try {
      const result = await api<{ id: string }>('/api/dashboard/companies', {
        body: {
          companyName: draft.companyName.trim(),
          firstName: draft.firstName.trim(),
          lastName: draft.lastName.trim(),
          email: draft.email.trim(),
          phone: draft.phone.trim(),
          taxId: draft.taxId.trim(),
          businessType: draft.businessType,
          billing,
          shipping,
        },
      })
      toast.success(result.message || 'Company created.')
      setCreating(false)
      setDraft(blankDraft())
      setFieldErrors({})
      navigate(`/sales/companies/${result.data.id}`)
    } catch (caught: unknown) {
      setFieldErrors(fieldErrorsFromApi(caught))
      toast.error(errorMessage(caught))
    } finally {
      submitLock.current = false
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-lg">
      <div className="flex flex-col gap-sm sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="font-display text-h4 text-ink">Companies</h2>
          <p className="mt-1 font-sans text-sm text-muted">Wholesale applications that have verified their email.</p>
        </div>
        {canWrite ? (
          <Button size="sm" className="w-fit" onClick={() => { setDraft(blankDraft()); setFieldErrors({}); setCreating(true) }}>
            Add company
          </Button>
        ) : null}
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
                      <Button variant="secondary" size="sm" onClick={() => navigate(`/sales/companies/${company.id}`)}>
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

      {creating ? (
        <SidePanel
          title="Add company"
          titleId="add-company-title"
          detail="The company starts as pending review. A new contact receives an email to set a password."
          pending={saving}
          onClose={closeForm}
          footer={
            <>
              <Button variant="secondary" size="sm" disabled={saving} onClick={closeForm}>
                Cancel
              </Button>
              <Button type="submit" form="add-company-form" size="sm" disabled={saving}>
                {saving ? 'Adding…' : 'Add company'}
              </Button>
            </>
          }
        >
          <form id="add-company-form" className="flex flex-col gap-lg" onSubmit={(event) => void createCompany(event)}>
            <TextField id="companyName" label="Company name" value={draft.companyName} error={fieldErrors.companyName} onChange={(event) => setDraft({ ...draft, companyName: event.target.value })} />
            <div className="grid grid-cols-1 gap-md sm:grid-cols-2">
              <TextField id="firstName" label="First name" value={draft.firstName} error={fieldErrors.firstName} onChange={(event) => setDraft({ ...draft, firstName: event.target.value })} />
              <TextField id="lastName" label="Last name" value={draft.lastName} error={fieldErrors.lastName} onChange={(event) => setDraft({ ...draft, lastName: event.target.value })} />
              <TextField id="email" label="Email" type="email" value={draft.email} error={fieldErrors.email} onChange={(event) => setDraft({ ...draft, email: event.target.value })} />
              <TextField id="phone" label="Phone" value={draft.phone} error={fieldErrors.phone} onChange={(event) => setDraft({ ...draft, phone: event.target.value })} />
              <TextField id="taxId" label="EIN / Tax ID" value={draft.taxId} error={fieldErrors.taxId} onChange={(event) => setDraft({ ...draft, taxId: event.target.value })} />
              <label className="block">
                <span className="mb-1.5 block font-sans text-sm font-medium text-copy">Business type</span>
                <select className={controlClass} value={draft.businessType} onChange={(event) => setDraft({ ...draft, businessType: event.target.value })}>
                  {Object.entries(TYPE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
                {fieldErrors.businessType ? <p className="mt-1 font-sans text-xs text-error">{fieldErrors.businessType}</p> : null}
              </label>
            </div>
            <section className="flex flex-col gap-md">
              <h3 className="font-sans text-xs font-medium uppercase tracking-wide text-muted">Billing address</h3>
              <AddressFields prefix="billing" value={draft.billing} errors={fieldErrors} onChange={(billing) => setDraft({ ...draft, billing })} />
            </section>
            <section className="flex flex-col gap-md border-t border-line pt-lg">
              <h3 className="font-sans text-xs font-medium uppercase tracking-wide text-muted">Shipping address</h3>
              <label className="flex items-center gap-2 font-sans text-sm text-copy">
                <input
                  type="checkbox"
                  checked={draft.shippingSameAsBilling}
                  onChange={(event) => setDraft({ ...draft, shippingSameAsBilling: event.target.checked })}
                />
                Same as billing
              </label>
              {draft.shippingSameAsBilling ? null : (
                <AddressFields prefix="shipping" value={draft.shipping} errors={fieldErrors} onChange={(shipping) => setDraft({ ...draft, shipping })} />
              )}
            </section>
          </form>
        </SidePanel>
      ) : null}
    </div>
  )
}

function AddressFields({
  prefix,
  value,
  errors,
  onChange,
}: {
  prefix: 'billing' | 'shipping'
  value: AddressDraft
  errors: Record<string, string>
  onChange: (next: AddressDraft) => void
}) {
  const set = (key: keyof AddressDraft) => (event: { target: { value: string } }) => onChange({ ...value, [key]: event.target.value })
  return (
    <div className="grid grid-cols-1 gap-md sm:grid-cols-2">
      <div className="sm:col-span-2">
        <TextField id={`${prefix}-line1`} label="Address" value={value.line1} error={errors[`${prefix}.line1`]} onChange={set('line1')} />
      </div>
      <div className="sm:col-span-2">
        <TextField id={`${prefix}-line2`} label="Address line 2" value={value.line2} error={errors[`${prefix}.line2`]} onChange={set('line2')} />
      </div>
      <TextField id={`${prefix}-city`} label="City" value={value.city} error={errors[`${prefix}.city`]} onChange={set('city')} />
      <TextField id={`${prefix}-state`} label="State" value={value.state} error={errors[`${prefix}.state`]} onChange={set('state')} />
      <TextField id={`${prefix}-postal`} label="Postal code" value={value.postalCode} error={errors[`${prefix}.postalCode`]} onChange={set('postalCode')} />
      <TextField id={`${prefix}-country`} label="Country" value={value.country} error={errors[`${prefix}.country`]} onChange={set('country')} />
    </div>
  )
}
