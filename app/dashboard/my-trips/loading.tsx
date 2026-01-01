import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
  // Route-level skeleton shown briefly during navigation.
  // Trips data itself is still served from TanStack Query cache (no refetch on tab switching).
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-5 w-96 mt-2" />
      </div>

      <div className="border-b border-slate-200">
        <div className="-mb-px flex gap-8">
          <Skeleton className="h-10 w-40 rounded-lg" />
          <Skeleton className="h-10 w-44 rounded-lg" />
        </div>
      </div>

      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-96" />
        <Skeleton className="h-10 w-32 rounded-lg" />
      </div>

      <div>
        <Skeleton className="h-6 w-56 mb-4" />
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
          <div className="border-b border-slate-200 bg-slate-50 px-6 py-4">
            <div className="flex gap-4">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>
          <div className="divide-y divide-slate-200">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="px-6 py-4">
                <div className="flex gap-4 items-center">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-4 w-52" />
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-36" />
                  <Skeleton className="h-4 w-24 ml-auto" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

