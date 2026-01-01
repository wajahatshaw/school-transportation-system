import { CompliancePageClient } from './compliance-page-client'

export default async function CompliancePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Compliance Overview</h1>
        <p className="text-slate-600 mt-1">Monitor driver compliance documents and expiration dates</p>
      </div>

      <CompliancePageClient />
    </div>
  )
}
