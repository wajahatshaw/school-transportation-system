import { redirect } from 'next/navigation'
import { getSession, getUserTenants } from '@/lib/auth/session'
import TenantSelector from './tenant-selector'
import AutoSelectTenant from './auto-select-tenant'

export default async function SelectTenantPage() {
  const session = await getSession()
  
  if (!session) {
    redirect('/login')
  }
  
  // If tenant already selected, redirect to dashboard
  if (session.tenantId) {
    redirect('/dashboard')
  }
  
  // Get user's available tenants
  const tenants = await getUserTenants(session.userId)
  
  // If user has no tenants, show error
  if (tenants.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              No Access
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              You don&apos;t have access to any organizations yet.
            </p>
            <p className="mt-4 text-center text-sm text-gray-600">
              Please contact your administrator to be added to an organization.
            </p>
          </div>
        </div>
      </div>
    )
  }
  
  // If user has exactly one tenant, auto-select it via client component
  if (tenants.length === 1) {
    return <AutoSelectTenant tenantId={tenants[0].id} />
  }
  
  // Show tenant selection UI
  return <TenantSelector tenants={tenants} userEmail={session.email} />
}

