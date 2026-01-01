import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/session'
import { AttendancePageClient } from './attendance-page-client'

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

      <AttendancePageClient role={session.role || 'user'} />
    </div>
  )
}
