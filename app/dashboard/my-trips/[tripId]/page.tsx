import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/session'
import { Skeleton } from '@/components/ui/skeleton'

export default async function TripDetailPage({
  params
}: {
  params: { tripId: string }
}) {
  const session = await getSession()
  
  if (!session) {
    redirect('/login')
  }
  
  if (!session.tenantId) {
    redirect('/select-tenant')
  }

  // Trip execution UI lives under /dashboard/attendance/[tripId]
  redirect(`/dashboard/attendance/${params.tripId}`)
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-12 w-64" />
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-96 w-full" />
    </div>
  )
}

