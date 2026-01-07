'use client'

import Link from 'next/link'
import {
  GraduationCap,
  School,
  Car,
  Route,
  Bus,
  AlertTriangle,
  CheckCircle,
  XCircle,
  TrendingUp,
  ArrowRight,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { getDashboardData } from '@/lib/actions'
import { Button } from '@/components/ui/button'
import { CardSkeleton } from '@/components/ui/skeleton'

export function DashboardPageClient() {
  const q = useQuery({
    queryKey: ['dashboard-data'],
    queryFn: () => getDashboardData(),
  })

  const data = q.data
  const isFirstLoad = q.isLoading && !q.data

  if (isFirstLoad) {
    return (
      <div className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(5)].map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
        <CardSkeleton />
        <CardSkeleton />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Schools */}
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Total Schools</p>
              <p className="text-3xl font-bold text-slate-900 mt-2">{data?.tenantsCount ?? 0}</p>
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
              <p className="text-3xl font-bold text-slate-900 mt-2">{data?.routesCount ?? 0}</p>
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
              <p className="text-3xl font-bold text-slate-900 mt-2">{data?.vehiclesCount ?? 0}</p>
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
              <p className="text-3xl font-bold text-slate-900 mt-2">{data?.studentsCount ?? 0}</p>
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
              <p className="text-3xl font-bold text-slate-900 mt-2">{data?.driversCount ?? 0}</p>
            </div>
            <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Car className="h-6 w-6 text-purple-600" />
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-4">Active driver records</p>
        </div>
      </div>

      {/* Quick Actions (unchanged) */}
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
      {(data?.complianceAlerts.expired?.length || data?.complianceAlerts.expiring?.length) ? (
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
            {(data?.complianceAlerts.expired ?? []).map((doc) => (
              <div key={`expired-${doc.driverId}-${doc.docType}-${String(doc.expiresAt)}`} className="flex items-start gap-3 p-3 bg-red-50 rounded-lg">
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

            {(data?.complianceAlerts.expiring ?? []).map((doc) => (
              <div key={`expiring-${doc.driverId}-${doc.docType}-${String(doc.expiresAt)}`} className="flex items-start gap-3 p-3 bg-yellow-50 rounded-lg">
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
      ) : null}

      {/* Recent Activity */}
      {data?.recentAuditLogs?.length ? (
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
            {data.recentAuditLogs.map((log) => (
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
      ) : null}
    </div>
  )
}


