import { Suspense } from 'react'
import Link from 'next/link'
import {
  GraduationCap,
  Car,
  AlertTriangle,
  CheckCircle,
  XCircle,
  TrendingUp,
  ArrowRight,
} from 'lucide-react'
import { getStudents, getDrivers } from '@/lib/actions'
import { withTenantContext, getTenantContext } from '@/lib/withTenantContext'
import { getComplianceStatus } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { CardSkeleton } from '@/components/ui/skeleton'

async function getAllComplianceDocuments() {
  const context = await getTenantContext()
  return await withTenantContext(context, async (tx) => {
    return await tx.driverComplianceDocument.findMany({
      where: {
        deletedAt: null
      },
      include: { driver: true },
      orderBy: { expiresAt: 'asc' },
    })
  })
}

async function getRecentAuditLogs() {
  const context = await getTenantContext()
  return await withTenantContext(context, async (tx) => {
    return await tx.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
    })
  })
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
  const [students, drivers, documents] = await Promise.all([
    getStudents(),
    getDrivers(),
    getAllComplianceDocuments(),
  ])

  const expiredDocs = documents.filter((d) => getComplianceStatus(d.expiresAt) === 'expired')
  const expiringDocs = documents.filter((d) => getComplianceStatus(d.expiresAt) === 'expiring')

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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

      {/* Total Drivers */}
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-600">Total Drivers</p>
            <p className="text-3xl font-bold text-slate-900 mt-2">{drivers.length}</p>
          </div>
          <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
            <Car className="h-6 w-6 text-green-600" />
          </div>
        </div>
        <p className="text-xs text-slate-500 mt-4">Active driver records</p>
      </div>

      {/* Expired Documents */}
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-600">Expired Docs</p>
            <p className="text-3xl font-bold text-red-600 mt-2">{expiredDocs.length}</p>
          </div>
          <div className="h-12 w-12 bg-red-100 rounded-lg flex items-center justify-center">
            <XCircle className="h-6 w-6 text-red-600" />
          </div>
        </div>
        <p className="text-xs text-slate-500 mt-4">Require immediate attention</p>
      </div>

      {/* Expiring Soon */}
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-600">Expiring Soon</p>
            <p className="text-3xl font-bold text-yellow-600 mt-2">{expiringDocs.length}</p>
          </div>
          <div className="h-12 w-12 bg-yellow-100 rounded-lg flex items-center justify-center">
            <AlertTriangle className="h-6 w-6 text-yellow-600" />
          </div>
        </div>
        <p className="text-xs text-slate-500 mt-4">Within 30 days</p>
      </div>
    </div>
  )
}

async function ComplianceAlerts() {
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
            <XCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
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
            <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
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
}

async function RecentActivity() {
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
            <div className="h-8 w-8 bg-slate-100 rounded-full flex items-center justify-center flex-shrink-0">
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
}
