import { getCurrentTenant } from '@/lib/actions'
import { DashboardLayoutClient } from '@/components/layout/dashboard-layout-client'
import { DataCacheProvider } from '@/lib/data-cache'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const tenant = await getCurrentTenant()

  return (
    <DataCacheProvider>
      <DashboardLayoutClient tenantName={tenant?.name || 'School Transportation Management'}>
        {children}
      </DashboardLayoutClient>
    </DataCacheProvider>
  )
}
