import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/session'
import { OperationsPageClient } from './operations-page-client'

export default async function OperationsPage() {
  const session = await getSession()
  
  if (!session) {
    redirect('/login')
  }
  
  if (!session.tenantId) {
    redirect('/select-tenant')
  }

  return <OperationsPageClient role={session.role || 'user'} />
}

