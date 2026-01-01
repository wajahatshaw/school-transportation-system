import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/session'
import { MyTripsPageClient } from './my-trips-page-client'

export default async function MyTripsPage() {
  const session = await getSession()
  
  if (!session) {
    redirect('/login')
  }
  
  if (!session.tenantId) {
    redirect('/select-tenant')
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">My Trips</h1>
        <p className="text-slate-600 mt-2">
          Manage today's route trips and mark student attendance
        </p>
      </div>

      <MyTripsPageClient />
    </div>
  )
}
