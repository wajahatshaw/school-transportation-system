import { CompliancePageClient } from './compliance-page-client'
import { ComplianceAlertsBadge } from './compliance-alerts-badge'

export default async function CompliancePage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Compliance Overview</h1>
          <p className="text-slate-600 mt-1">Monitor driver compliance documents and expiration dates</p>
        </div>
        <div className="flex items-center gap-3">
          <ComplianceAlertsBadge />
        </div>
      </div>

      <CompliancePageClient />
    </div>
  )
}
