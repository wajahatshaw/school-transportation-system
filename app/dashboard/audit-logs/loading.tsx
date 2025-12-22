import { TableSkeleton } from '@/components/ui/skeleton'

export default function AuditLogsLoading() {
  return (
    <div className="space-y-6">
      <div>
        <div className="h-9 w-48 bg-slate-200 rounded animate-pulse" />
        <div className="h-5 w-96 bg-slate-200 rounded animate-pulse mt-2" />
      </div>
      <TableSkeleton />
    </div>
  )
}
