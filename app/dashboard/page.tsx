import { Suspense } from 'react'
import Link from 'next/link'
import {
  GraduationCap,
  School,
  Car,
  Route,
  Bus,
  CheckCircle,
  AlertTriangle,
  XCircle,
  TrendingUp,
  ArrowRight,
} from 'lucide-react'
import { getRoutes, getStudents, getVehicles, getTenantsCount } from '@/lib/actions'
import { withTenantContext, getTenantContext } from '@/lib/withTenantContext'
import { getComplianceStatus } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { CardSkeleton } from '@/components/ui/skeleton'

async function getAllComplianceDocuments() {
  try {
    const context = await getTenantContext()
    return await withTenantContext(context, async (tx) => {
    // DATABASE-LEVEL: Using view for true database-enforced tenant isolation
    const docs = await tx.$queryRaw<Array<{
      id: string
      tenant_id: string
      driver_id: string
      doc_type: string
      issued_at: Date | null
      expires_at: Date
      file_url: string | null
      deleted_at: Date | null
      deleted_by: string | null
      created_at: Date
      updated_at: Date
    }>>`
      SELECT * FROM app.v_driver_compliance_documents
      ORDER BY expires_at ASC
    `
    
    // Fetch drivers separately (view doesn't include relations)
    const driverIds = [...new Set(docs.map(d => d.driver_id))]
    const drivers = driverIds.length > 0 ? await tx.driver.findMany({
      where: { id: { in: driverIds }, tenantId: context.tenantId, deletedAt: null }
    }) : []
    const driverMap = new Map(drivers.map(d => [d.id, d]))
    
    return docs
      .map(d => {
        const driver = driverMap.get(d.driver_id)
        if (!driver) return null // Filter out documents without drivers
        return {
          id: d.id,
          tenantId: d.tenant_id,
          driverId: d.driver_id,
          docType: d.doc_type,
          issuedAt: d.issued_at,
          expiresAt: d.expires_at,
          fileUrl: d.file_url,
          deletedAt: d.deleted_at,
          deletedBy: d.deleted_by,
          createdAt: d.created_at,
          updatedAt: d.updated_at,
          driver
        }
      })
      .filter((doc): doc is NonNullable<typeof doc> => doc !== null)
    })
  } catch (error) {
    console.error('Error fetching compliance documents:', error)
    return [] // Return empty array on error to prevent page crash
  }
}

async function getRecentAuditLogs() {
  try {
    const context = await getTenantContext()
    return await withTenantContext(context, async (tx) => {
    // DATABASE-LEVEL: Using view for true database-enforced tenant isolation
    const logs = await tx.$queryRaw<Array<{
      id: string
      tenant_id: string
      table_name: string
      record_id: string
      action: string
      before: any
      after: any
      user_id: string
      ip: string | null
      created_at: Date
    }>>`
      SELECT * FROM app.v_audit_logs
      ORDER BY created_at DESC
      LIMIT 5
    `
    
    return logs.map(l => ({
      id: l.id,
      tenantId: l.tenant_id,
      tableName: l.table_name,
      recordId: l.record_id,
      action: l.action,
      before: l.before,
      after: l.after,
      userId: l.user_id,
      ip: l.ip,
      createdAt: l.created_at
    }))
    })
  } catch (error) {
    console.error('Error fetching audit logs:', error)
    return [] // Return empty array on error to prevent page crash
  }
}

export default async function DashboardPage() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Dashboard</h1>
        <p className="text-slate-600 mt-1">Welcome back! Here's what's happening today.</p>
      </div>

      {/* Key Metrics */}
      <Suspense
        fallback={
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        }
      >
        <MetricsCards />
      </Suspense>

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link href="/dashboard/students">
            <div className="bg-white rounded-lg border border-slate-200 p-6 hover:shadow-md transition-shadow cursor-pointer group">
              <GraduationCap className="h-8 w-8 text-slate-900 mb-3 group-hover:scale-110 transition-transform" />
              <h3 className="font-semibold text-slate-900">Manage Students</h3>
              <p className="text-sm text-slate-600 mt-1">Add or edit student records</p>
            </div>
          </Link>

          <Link href="/dashboard/drivers">
            <div className="bg-white rounded-lg border border-slate-200 p-6 hover:shadow-md transition-shadow cursor-pointer group">
              <Car className="h-8 w-8 text-slate-900 mb-3 group-hover:scale-110 transition-transform" />
              <h3 className="font-semibold text-slate-900">Manage Drivers</h3>
              <p className="text-sm text-slate-600 mt-1">View and update driver info</p>
            </div>
          </Link>

          <Link href="/dashboard/compliance">
            <div className="bg-white rounded-lg border border-slate-200 p-6 hover:shadow-md transition-shadow cursor-pointer group">
              <CheckCircle className="h-8 w-8 text-slate-900 mb-3 group-hover:scale-110 transition-transform" />
              <h3 className="font-semibold text-slate-900">Compliance</h3>
              <p className="text-sm text-slate-600 mt-1">Monitor document status</p>
            </div>
          </Link>

          <Link href="/dashboard/audit-logs">
            <div className="bg-white rounded-lg border border-slate-200 p-6 hover:shadow-md transition-shadow cursor-pointer group">
              <TrendingUp className="h-8 w-8 text-slate-900 mb-3 group-hover:scale-110 transition-transform" />
              <h3 className="font-semibold text-slate-900">Audit Logs</h3>
              <p className="text-sm text-slate-600 mt-1">Review system activity</p>
            </div>
          </Link>
        </div>
      </div>

      {/* Compliance Alerts */}
      <Suspense fallback={<CardSkeleton />}>
        <ComplianceAlerts />
      </Suspense>

      {/* Recent Activity */}
      <Suspense fallback={<CardSkeleton />}>
        <RecentActivity />
      </Suspense>
    </div>
  )
}

async function MetricsCards() {
  try {
    const [students, routes, vehicles, tenantsCount] = await Promise.all([
      getStudents(), 
      getRoutes(), 
      getVehicles(),
      getTenantsCount()
    ])

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {/* Total Schools */}
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-600">Total Schools</p>
            <p className="text-3xl font-bold text-slate-900 mt-2">{tenantsCount}</p>
          </div>
          <div className="h-12 w-12 bg-indigo-100 rounded-lg flex items-center justify-center">
            <School className="h-6 w-6 text-indigo-600" />
          </div>
        </div>
        <p className="text-xs text-slate-500 mt-4">Total schools in the system</p>
      </div>

      {/* Total Routes */}
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-600">Total Routes</p>
            <p className="text-3xl font-bold text-slate-900 mt-2">{routes.length}</p>
          </div>
          <div className="h-12 w-12 bg-emerald-100 rounded-lg flex items-center justify-center">
            <Route className="h-6 w-6 text-emerald-600" />
          </div>
        </div>
        <p className="text-xs text-slate-500 mt-4">Active route records</p>
      </div>

      {/* Total Vehicles */}
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-600">Total Vehicles</p>
            <p className="text-3xl font-bold text-slate-900 mt-2">{vehicles.length}</p>
          </div>
          <div className="h-12 w-12 bg-amber-100 rounded-lg flex items-center justify-center">
            <Bus className="h-6 w-6 text-amber-600" />
          </div>
        </div>
        <p className="text-xs text-slate-500 mt-4">Active vehicle records</p>
      </div>

      {/* Total Students */}
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-600">Total Students</p>
            <p className="text-3xl font-bold text-slate-900 mt-2">{students.length}</p>
          </div>
          <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
            <GraduationCap className="h-6 w-6 text-blue-600" />
          </div>
        </div>
        <p className="text-xs text-slate-500 mt-4">Active student records</p>
      </div>
    </div>
  )
  } catch (error) {
    console.error('Error loading metrics:', error)
    // Return error state instead of crashing
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-lg border border-slate-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Loading...</p>
                <p className="text-3xl font-bold text-slate-400 mt-2">—</p>
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-4">Unable to load data</p>
          </div>
        ))}
      </div>
    )
  }
}

async function ComplianceAlerts() {
  try {
    const documents = await getAllComplianceDocuments()
    const expiredDocs = documents
    .filter((d) => getComplianceStatus(d.expiresAt) === 'expired')
    .slice(0, 5)
  const expiringDocs = documents
    .filter((d) => getComplianceStatus(d.expiresAt) === 'expiring')
    .slice(0, 5)

  if (expiredDocs.length === 0 && expiringDocs.length === 0) {
    return null
  }

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-slate-900">Compliance Alerts</h2>
        <Link href="/dashboard/compliance">
          <Button variant="ghost" size="sm">
            View All
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </Link>
      </div>

      <div className="space-y-3">
        {expiredDocs.map((doc) => (
          <div key={doc.id} className="flex items-start gap-3 p-3 bg-red-50 rounded-lg">
            <XCircle className="h-5 w-5 text-red-600 mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900">
                {doc.driver.firstName} {doc.driver.lastName}
              </p>
              <p className="text-sm text-slate-600">
                {doc.docType} expired on {new Date(doc.expiresAt).toLocaleDateString()}
              </p>
            </div>
            <Link href={`/dashboard/drivers/${doc.driverId}/compliance`}>
              <Button variant="ghost" size="sm" className="text-red-600">
                Review
              </Button>
            </Link>
          </div>
        ))}

        {expiringDocs.map((doc) => (
          <div key={doc.id} className="flex items-start gap-3 p-3 bg-yellow-50 rounded-lg">
            <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900">
                {doc.driver.firstName} {doc.driver.lastName}
              </p>
              <p className="text-sm text-slate-600">
                {doc.docType} expires on {new Date(doc.expiresAt).toLocaleDateString()}
              </p>
            </div>
            <Link href={`/dashboard/drivers/${doc.driverId}/compliance`}>
              <Button variant="ghost" size="sm" className="text-yellow-600">
                Review
              </Button>
            </Link>
          </div>
        ))}
      </div>
    </div>
  )
  } catch (error) {
    console.error('Error loading compliance alerts:', error)
    return null // Don't show section if there's an error
  }
}

async function RecentActivity() {
  try {
    const logs = await getRecentAuditLogs()

    if (logs.length === 0) {
      return null
    }

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-slate-900">Recent Activity</h2>
        <Link href="/dashboard/audit-logs">
          <Button variant="ghost" size="sm">
            View All
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </Link>
      </div>

      <div className="space-y-3">
        {logs.map((log) => (
          <div key={log.id} className="flex items-start gap-3 py-2 border-b border-slate-100 last:border-0">
            <div className="h-8 w-8 bg-slate-100 rounded-full flex items-center justify-center shrink-0">
              <TrendingUp className="h-4 w-4 text-slate-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-slate-900">
                <span className="font-medium">{log.action}</span> on{' '}
                <span className="font-mono text-xs">{log.tableName}</span>
              </p>
              <p className="text-xs text-slate-500">
                {new Date(log.createdAt || '').toLocaleString()}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
  } catch (error) {
    console.error('Error loading recent activity:', error)
    return null // Don't show section if there's an error
  }
}
