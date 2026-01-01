import { Suspense } from 'react'
import { redirect, notFound } from 'next/navigation'
import { getSession } from '@/lib/auth/session'
import { TripDetailViewClient } from './trip-detail-view-client'
import { Skeleton } from '@/components/ui/skeleton'

export default async function TripDetailPage({
  params
}: {
  params: Promise<{ tripId: string }>
}) {
  const session = await getSession()
  
  if (!session) {
    redirect('/login')
  }
  
  if (!session.tenantId) {
    redirect('/select-tenant')
  }

  // Netlify/Next 16 can provide params as a Promise; unwrap safely
  const resolvedParams = await params
  const tripId = resolvedParams?.tripId
  if (!tripId || typeof tripId !== 'string') {
    notFound()
  }

  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <TripDetailViewClient tripId={tripId} role={session.role || 'user'} />
    </Suspense>
  )
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

