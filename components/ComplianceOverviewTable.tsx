'use client'

import { useState } from 'react'
import Link from 'next/link'
import { DriverComplianceDocument, Driver } from '@prisma/client'
import { AlertTriangle, CheckCircle, XCircle, ExternalLink } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { formatDate, getComplianceStatus } from '@/lib/utils'

type ComplianceFilter = 'all' | 'expired' | 'expiring' | 'valid'

interface ComplianceOverviewTableProps {
  documents: (DriverComplianceDocument & { driver: Driver })[]
}

export function ComplianceOverviewTable({ documents }: ComplianceOverviewTableProps) {
  const [filter, setFilter] = useState<ComplianceFilter>('all')

  const filteredDocuments = documents.filter((doc) => {
    if (filter === 'all') return true
    const status = getComplianceStatus(doc.expiresAt)
    return status === filter
  })

  const getStatusBadge = (expiresAt: Date | string) => {
    const status = getComplianceStatus(expiresAt)

    switch (status) {
      case 'expired':
        return (
          <Badge variant="danger" className="gap-1">
            <XCircle className="h-3 w-3" />
            Expired
          </Badge>
        )
      case 'expiring':
        return (
          <Badge variant="warning" className="gap-1">
            <AlertTriangle className="h-3 w-3" />
            Expiring Soon
          </Badge>
        )
      case 'valid':
        return (
          <Badge variant="success" className="gap-1">
            <CheckCircle className="h-3 w-3" />
            Valid
          </Badge>
        )
    }
  }

  const expiredCount = documents.filter((d) => getComplianceStatus(d.expiresAt) === 'expired').length
  const expiringCount = documents.filter((d) => getComplianceStatus(d.expiresAt) === 'expiring').length
  const validCount = documents.filter((d) => getComplianceStatus(d.expiresAt) === 'valid').length

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
              <XCircle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-slate-600">Expired</p>
              <p className="text-2xl font-bold text-slate-900">{expiredCount}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-yellow-100">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-slate-600">Expiring Soon</p>
              <p className="text-2xl font-bold text-slate-900">{expiringCount}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-slate-600">Valid</p>
              <p className="text-2xl font-bold text-slate-900">{validCount}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <Button
          variant={filter === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('all')}
        >
          All ({documents.length})
        </Button>
        <Button
          variant={filter === 'expired' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('expired')}
        >
          Expired ({expiredCount})
        </Button>
        <Button
          variant={filter === 'expiring' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('expiring')}
        >
          Expiring Soon ({expiringCount})
        </Button>
        <Button
          variant={filter === 'valid' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('valid')}
        >
          Valid ({validCount})
        </Button>
      </div>

      {/* Table */}
      {filteredDocuments.length === 0 ? (
        <EmptyState
          icon={<div className="text-6xl">📋</div>}
          title="No documents found"
          description={
            filter === 'all'
              ? 'No compliance documents have been added yet.'
              : `No ${filter} documents found.`
          }
        />
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Driver
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Document Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Issued Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Expiry Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {filteredDocuments.map((doc) => {
                  const status = getComplianceStatus(doc.expiresAt)
                  return (
                    <tr
                      key={doc.id}
                      className={
                        status === 'expired'
                          ? 'bg-red-50'
                          : status === 'expiring'
                          ? 'bg-yellow-50'
                          : ''
                      }
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-slate-900">
                          {doc.driver.firstName} {doc.driver.lastName}
                        </div>
                        <div className="text-sm text-slate-500">{doc.driver.licenseNumber}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-slate-900">{doc.docType}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-slate-500">{formatDate(doc.issuedAt)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-slate-900">{formatDate(doc.expiresAt)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(doc.expiresAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Link href={`/dashboard/drivers/${doc.driverId}/compliance`}>
                          <Button variant="ghost" size="sm" className="text-blue-600">
                            <ExternalLink className="h-4 w-4 mr-1" />
                            View Details
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
