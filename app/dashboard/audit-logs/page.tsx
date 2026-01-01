import { AuditLogsPageClient } from './audit-logs-page-client'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function AuditLogsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Audit Logs</h1>
        <p className="text-slate-600 mt-1">
          View a complete history of all changes made in the system
        </p>
      </div>

      <AuditLogsPageClient />
    </div>
  )
}
