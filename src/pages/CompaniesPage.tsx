import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

import { api, errorMessage } from '../api/client'
import { Button } from '../components/Button'

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

export function CompaniesPage() {
  const navigate = useNavigate()
  const [companies, setCompanies] = useState<CompanySummary[]>([])
  const [loading, setLoading] = useState(true)

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
    </div>
  )
}
