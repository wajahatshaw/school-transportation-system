import { CardSkeleton } from '@/components/ui/skeleton'

export default function DashboardLoading() {
  return (
    <div className="space-y-8">
      <div>
        <div className="h-9 w-48 bg-slate-200 rounded animate-pulse" />
        <div className="h-5 w-96 bg-slate-200 rounded animate-pulse mt-2" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>

      <div>
        <div className="h-6 w-32 bg-slate-200 rounded animate-pulse mb-4" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      </div>

      <CardSkeleton />
      <CardSkeleton />
    </div>
  )
}
