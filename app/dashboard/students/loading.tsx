import { Suspense } from 'react'
import { TableSkeleton } from '@/components/ui/skeleton'

export default function StudentsLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="h-9 w-48 bg-slate-200 rounded animate-pulse" />
          <div className="h-5 w-64 bg-slate-200 rounded animate-pulse mt-2" />
        </div>
        <div className="h-10 w-32 bg-slate-200 rounded animate-pulse" />
      </div>
      <TableSkeleton />
    </div>
  )
}
