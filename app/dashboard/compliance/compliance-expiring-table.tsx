'use client'

import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { AlertTriangle, ExternalLink } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { EmptyState } from '@/components/ui/empty-state'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'

interface ComplianceSummary {
  tenantId: string
  totalDrivers: number
  compliantDrivers: number
  nonCompliantDrivers: number
  compliancePercentage: number
  expiredCount: number
  expiringCount: number
  missingCount: number
  topIssues: Array<{ docType: string; count: number }>
}

interface ComplianceExpiringTableProps {
  summary: ComplianceSummary
}

type DocumentFilter = 'all' | 'expired' | 'expiring'

async function fetchExpiringDocuments(filter: DocumentFilter = 'all') {
  const params = new URLSearchParams()
  // Always pass the filter parameter, even if it's 'all'
  params.set('filter', filter)
  const res = await fetch(`/api/compliance/documents/expiring?${params.toString()}`)
  if (!res.ok) {
    let errorData
    try {
      errorData = await res.json()
    } catch {
      errorData = { error: `HTTP ${res.status}: ${res.statusText}` }
    }
    const errorMessage = errorData.error || errorData.details || `Failed to fetch expiring documents: ${res.status} ${res.statusText}`
    throw new Error(errorMessage)
  }
  const data = await res.json()
  if (!data.success) {
    throw new Error(data.error || 'Failed to fetch expiring documents')
  }
  return data
}

export function ComplianceExpiringTable({ summary }: ComplianceExpiringTableProps) {
  const queryClient = useQueryClient()
  const [filter, setFilter] = useState<DocumentFilter>('all')
  
  const { data: response, isLoading, error } = useQuery({
    queryKey: ['compliance-expiring-documents', filter],
    queryFn: () => fetchExpiringDocuments(filter),
    // Use cache immediately if available
    initialData: () => {
      return queryClient.getQueryData(['compliance-expiring-documents', filter]) as any
    },
    initialDataUpdatedAt: () => {
      return queryClient.getQueryState(['compliance-expiring-documents', filter])?.dataUpdatedAt
    },
    placeholderData: (previousData) => {
      // Don't use placeholder data when filter changes - force refetch
      return undefined
    },
    refetchInterval: 30000, // Refetch every 30 seconds to catch newly expired documents
    staleTime: 10000, // Consider data stale after 10 seconds
    // Ensure query refetches when filter changes
    enabled: true,
  })
  
  const expiringDocs = response?.data || []
  const expiredCount = response?.expired || 0
  const expiringCount = response?.expiring || 0
  
  if (isLoading && !response) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
        <h2 className="text-xl font-semibold text-slate-900 mb-4">Expiring & Expired Documents</h2>
        <div className="text-sm text-slate-500">Loading...</div>
      </div>
    )
  }
  
  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
        <h2 className="text-xl font-semibold text-slate-900 mb-4">Expiring & Expired Documents</h2>
        <div className="text-sm text-red-600">
          {error instanceof Error ? error.message : 'Failed to load documents'}
        </div>
      </div>
    )
  }
  
  // Show empty state only when not loading and no documents match the current filter
  if (!isLoading && expiringDocs.length === 0) {
    const emptyMessage = filter === 'expired' 
      ? 'No expired documents found.'
      : filter === 'expiring'
      ? 'No documents expiring soon.'
      : 'No documents are expiring or expired at this time.'
    
    return (
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-slate-900">Expiring & Expired Documents</h2>
        </div>
        
        {/* Filters */}
        <div className="mb-4 flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'all'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            All ({expiredCount + expiringCount})
          </button>
          <button
            onClick={() => setFilter('expired')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'expired'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Expired ({expiredCount})
          </button>
          <button
            onClick={() => setFilter('expiring')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'expiring'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Expiring Soon ({expiringCount})
          </button>
        </div>
        
        <EmptyState
          icon={<div className="text-6xl">✅</div>}
          title="All documents are up to date"
          description={emptyMessage}
        />
      </div>
    )
  }
  
  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-slate-900">Expiring & Expired Documents</h2>
      </div>
      
      {/* Filters */}
      <div className="mb-4 flex gap-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === 'all'
              ? 'bg-slate-900 text-white'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          All ({expiredCount + expiringCount})
        </button>
        <button
          onClick={() => setFilter('expired')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === 'expired'
              ? 'bg-slate-900 text-white'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          Expired ({expiredCount})
        </button>
        <button
          onClick={() => setFilter('expiring')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === 'expiring'
              ? 'bg-slate-900 text-white'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          Expiring Soon ({expiringCount})
        </button>
      </div>
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
                Expiry Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Days Until Expiry
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
            {expiringDocs.map((doc: {
              docId: string
              driverId: string
              driver: {
                id: string
                firstName: string
                lastName: string
                email: string | null
                licenseNumber: string | null
              }
              docType: string
              expiresAt: Date | string
              daysUntilExpiry: number
              status: 'expired' | 'expiring' | 'valid'
              isRequired: boolean
            }, idx: number) => (
              <tr
                key={`${doc.docId}-${idx}`}
                className={
                  doc.status === 'expired'
                    ? 'bg-red-50'
                    : 'bg-yellow-50'
                }
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  {doc.driver ? (
                    <div className="text-sm font-medium text-slate-900">
                      {doc.driver.firstName} {doc.driver.lastName}
                    </div>
                  ) : (
                    <div className="text-sm text-slate-500">Unknown Driver</div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-slate-900">{doc.docType}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-slate-900">{formatDate(doc.expiresAt)}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-slate-900">
                    {doc.daysUntilExpiry < 0
                      ? `${Math.abs(doc.daysUntilExpiry)} days ago`
                      : `${doc.daysUntilExpiry} days`}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {doc.status === 'expired' ? (
                    <Badge variant="danger" className="gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      Expired
                    </Badge>
                  ) : (
                    <Badge variant="warning" className="gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      Expiring Soon
                    </Badge>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <Link href={`/dashboard/drivers/${doc.driverId}/compliance`}>
                    <Button variant="ghost" size="sm" className="text-slate-900 hover:text-slate-700">
                      <ExternalLink className="h-4 w-4 mr-1" />
                      View
                    </Button>
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

