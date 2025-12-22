import { TableSkeleton, CardSkeleton } from '@/components/ui/skeleton'

export default function ComplianceLoading() {
  return (
    <div className="space-y-6">
      <div>
        <div className="h-9 w-64 bg-slate-200 rounded animate-pulse" />
        <div className="h-5 w-96 bg-slate-200 rounded animate-pulse mt-2" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>

      <div className="flex gap-2">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-9 w-24 bg-slate-200 rounded animate-pulse" />
        ))}
      </div>

      <TableSkeleton />
    </div>
  )
}
