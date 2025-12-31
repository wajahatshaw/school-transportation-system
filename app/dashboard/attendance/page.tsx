import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/session'
import { AttendancePageClient } from './attendance-page-client'
import { Skeleton } from '@/components/ui/skeleton'

export default async function AttendancePage() {
  const session = await getSession()
  
  if (!session) {
    redirect('/login')
  }
  
  if (!session.tenantId) {
    redirect('/select-tenant')
  }

  const isDriver = session.role === 'driver'

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">
          {isDriver ? "Today's Attendance" : 'Attendance History'}
        </h1>
        <p className="text-slate-600 mt-2">
          {isDriver
            ? 'Mark attendance for your assigned trips. Upcoming trips are read-only.'
            : 'View and manage all route trip attendance records'}
        </p>
      </div>

      <Suspense fallback={<LoadingSkeleton />}>
        <AttendancePageClient role={session.role || 'user'} />
      </Suspense>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-96 w-full" />
    </div>
  )
}

