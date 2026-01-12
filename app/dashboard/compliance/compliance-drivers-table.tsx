'use client'

import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CheckCircle, XCircle, AlertTriangle, ExternalLink } from 'lucide-react'
import { EmptyState } from '@/components/ui/empty-state'
import { Pagination } from '@/components/ui/pagination'

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
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)

  const paginatedDrivers = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    return drivers.slice(startIndex, endIndex)
  }, [drivers, currentPage, itemsPerPage])

  const totalPages = Math.ceil(drivers.length / itemsPerPage)

  // Reset to page 1 when drivers list changes (e.g., when filters change)
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1)
    } else if (drivers.length > 0 && currentPage < 1) {
      setCurrentPage(1)
    }
  }, [drivers.length, totalPages, currentPage])

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
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-3 sm:px-4 lg:px-6 py-2.5 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-slate-500 uppercase tracking-wider">
                Driver
              </th>
              <th className="px-3 sm:px-4 lg:px-6 py-2.5 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-slate-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-3 sm:px-4 lg:px-6 py-2.5 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-slate-500 uppercase tracking-wider">
                Compliance Score
              </th>
              <th className="px-3 sm:px-4 lg:px-6 py-2.5 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-slate-500 uppercase tracking-wider">
                Issues
              </th>
              <th className="px-3 sm:px-4 lg:px-6 py-2.5 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-slate-500 uppercase tracking-wider">
                Missing Docs
              </th>
              <th className="px-3 sm:px-4 lg:px-6 py-2.5 sm:py-3 text-right text-[10px] sm:text-xs font-medium text-slate-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-200">
            {paginatedDrivers.map((driver) => (
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
              <td className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 whitespace-nowrap">
                {driver.driver ? (
                  <div>
                    <div className="text-xs sm:text-sm font-medium text-slate-900">
                      {driver.driver.firstName} {driver.driver.lastName}
                    </div>
                    <div className="text-[10px] sm:text-xs text-slate-500">
                      {driver.driver.licenseNumber || driver.driver.email || 'No details'}
                    </div>
                  </div>
                ) : (
                  <div className="text-xs sm:text-sm text-slate-500">Unknown Driver</div>
                )}
              </td>
              <td className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 whitespace-nowrap">
                {driver.compliant ? (
                  <Badge variant="success" className="gap-1 text-[10px] sm:text-xs">
                    <CheckCircle className="h-3 w-3" />
                    Compliant
                  </Badge>
                ) : (
                  <Badge variant="danger" className="gap-1 text-[10px] sm:text-xs">
                    <XCircle className="h-3 w-3" />
                    Non-Compliant
                  </Badge>
                )}
              </td>
              <td className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 whitespace-nowrap">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <div className="text-xs sm:text-sm font-medium text-slate-900 min-w-[2.5rem] sm:min-w-[3rem]">
                    {driver.complianceScore}%
                  </div>
                  <div className="w-16 sm:w-20 lg:w-24 bg-slate-200 rounded-full h-1.5 sm:h-2 flex-shrink-0">
                    <div
                      className="h-1.5 sm:h-2 rounded-full bg-slate-900"
                      style={{ width: `${driver.complianceScore}%` }}
                    />
                  </div>
                </div>
              </td>
              <td className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 whitespace-nowrap">
                <div className="text-xs sm:text-sm text-slate-900 space-y-0.5 sm:space-y-1">
                  {driver.expiredCount > 0 && (
                    <div className="flex items-center gap-1 text-slate-900">
                      <XCircle className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                      <span>{driver.expiredCount} expired</span>
                    </div>
                  )}
                  {driver.expiringCount > 0 && (
                    <div className="flex items-center gap-1 text-slate-900">
                      <AlertTriangle className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                      <span>{driver.expiringCount} expiring</span>
                    </div>
                  )}
                  {driver.missingCount > 0 && (
                    <div className="flex items-center gap-1 text-slate-900">
                      <AlertTriangle className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                      <span>{driver.missingCount} missing</span>
                    </div>
                  )}
                  {driver.expiredCount === 0 && driver.expiringCount === 0 && driver.missingCount === 0 && (
                    <div className="text-slate-600">No issues</div>
                  )}
                </div>
              </td>
              <td className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4">
                {driver.missingRequiredDocs.length > 0 ? (
                  <div className="text-xs sm:text-sm text-slate-900">
                    {driver.missingRequiredDocs.slice(0, 2).join(', ')}
                    {driver.missingRequiredDocs.length > 2 && (
                      <span className="text-slate-500">
                        {' '}+{driver.missingRequiredDocs.length - 2} more
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="text-xs sm:text-sm text-slate-500">None</div>
                )}
              </td>
              <td className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 whitespace-nowrap text-right text-xs sm:text-sm font-medium">
                <Link href={`/dashboard/drivers/${driver.driverId}/compliance`}>
                  <Button variant="ghost" size="sm" className="text-slate-900 hover:text-slate-700 h-7 sm:h-8 text-[10px] sm:text-xs px-2 sm:px-3">
                    <ExternalLink className="h-3 w-3 sm:h-4 sm:w-4 mr-0.5 sm:mr-1" />
                    <span className="hidden sm:inline">View Details</span>
                    <span className="sm:hidden">View</span>
                  </Button>
                </Link>
              </td>
            </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {drivers.length > 0 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          itemsPerPage={itemsPerPage}
          totalItems={drivers.length}
          onItemsPerPageChange={setItemsPerPage}
        />
      )}
    </div>
  )
}

