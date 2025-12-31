import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/session'
import { getCurrentTenant } from '@/lib/actions'
import { DashboardLayoutClient } from '@/components/layout/dashboard-layout-client'
import { DataCacheProvider } from '@/lib/data-cache'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Ensure user is authenticated and has tenant selected
  const session = await getSession()
  
  if (!session) {
    redirect('/login')
  }
  
  if (!session.tenantId) {
    redirect('/select-tenant')
  }
  
  const tenant = await getCurrentTenant()

  return (
    <DataCacheProvider>
      <DashboardLayoutClient 
        tenantName={tenant?.name || 'School Transportation Management'}
        userEmail={session.email}
        tenantId={session.tenantId}
        role={session.role || 'user'}
      >
        {children}
      </DashboardLayoutClient>
    </DataCacheProvider>
  )
}
