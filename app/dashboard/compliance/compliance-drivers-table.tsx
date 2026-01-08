'use client'

import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CheckCircle, XCircle, AlertTriangle, ExternalLink } from 'lucide-react'
import { EmptyState } from '@/components/ui/empty-state'

interface DriverCompliance {
  driverId: string
  driver: {
    id: string
    firstName: string
    lastName: string
    email: string | null
    licenseNumber: string | null
  } | null
  compliant: boolean
  complianceScore: number
  expiredCount: number
  expiringCount: number
  missingCount: number
  missingRequiredDocs: string[]
  documents: Array<{
    docId: string
    docType: string
    status: string
    expiresAt: Date | string
    daysUntilExpiry: number
  }>
}

interface ComplianceDriversTableProps {
  drivers: DriverCompliance[]
}

export function ComplianceDriversTable({ drivers }: ComplianceDriversTableProps) {
  if (drivers.length === 0) {
    return (
      <EmptyState
        icon={<div className="text-6xl">👥</div>}
        title="No drivers found"
        description="No drivers match your current filters."
      />
    )
  }
  
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-200">
        <thead className="bg-slate-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
              Driver
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
              Status
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
              Compliance Score
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
              Issues
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
              Missing Docs
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-slate-200">
          {drivers.map((driver) => (
            <tr
              key={driver.driverId}
              className={
                !driver.compliant
                  ? 'bg-red-50'
                  : driver.expiringCount > 0
                  ? 'bg-yellow-50'
                  : ''
              }
            >
              <td className="px-6 py-4 whitespace-nowrap">
                {driver.driver ? (
                  <div>
                    <div className="text-sm font-medium text-slate-900">
                      {driver.driver.firstName} {driver.driver.lastName}
                    </div>
                    <div className="text-sm text-slate-500">
                      {driver.driver.licenseNumber || driver.driver.email || 'No details'}
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-slate-500">Unknown Driver</div>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                {driver.compliant ? (
                  <Badge variant="success" className="gap-1">
                    <CheckCircle className="h-3 w-3" />
                    Compliant
                  </Badge>
                ) : (
                  <Badge variant="danger" className="gap-1">
                    <XCircle className="h-3 w-3" />
                    Non-Compliant
                  </Badge>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center gap-2">
                  <div className="text-sm font-medium text-slate-900">
                    {driver.complianceScore}%
                  </div>
                  <div className="w-24 bg-slate-200 rounded-full h-2">
                    <div
                      className="h-2 rounded-full bg-slate-900"
                      style={{ width: `${driver.complianceScore}%` }}
                    />
                  </div>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-slate-900 space-y-1">
                  {driver.expiredCount > 0 && (
                    <div className="flex items-center gap-1 text-slate-900">
                      <XCircle className="h-3 w-3" />
                      {driver.expiredCount} expired
                    </div>
                  )}
                  {driver.expiringCount > 0 && (
                    <div className="flex items-center gap-1 text-slate-900">
                      <AlertTriangle className="h-3 w-3" />
                      {driver.expiringCount} expiring
                    </div>
                  )}
                  {driver.missingCount > 0 && (
                    <div className="flex items-center gap-1 text-slate-900">
                      <AlertTriangle className="h-3 w-3" />
                      {driver.missingCount} missing
                    </div>
                  )}
                  {driver.expiredCount === 0 && driver.expiringCount === 0 && driver.missingCount === 0 && (
                    <div className="text-slate-600">No issues</div>
                  )}
                </div>
              </td>
              <td className="px-6 py-4">
                {driver.missingRequiredDocs.length > 0 ? (
                  <div className="text-sm text-slate-900">
                    {driver.missingRequiredDocs.slice(0, 2).join(', ')}
                    {driver.missingRequiredDocs.length > 2 && (
                      <span className="text-slate-500">
                        {' '}+{driver.missingRequiredDocs.length - 2} more
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="text-sm text-slate-500">None</div>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <Link href={`/dashboard/drivers/${driver.driverId}/compliance`}>
                  <Button variant="ghost" size="sm" className="text-slate-900 hover:text-slate-700">
                    <ExternalLink className="h-4 w-4 mr-1" />
                    View Details
                  </Button>
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

