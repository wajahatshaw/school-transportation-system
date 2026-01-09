'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { ComplianceSummaryCards } from './compliance-summary-cards'
import { ComplianceDriversTable } from './compliance-drivers-table'
import { ComplianceExpiringTable } from './compliance-expiring-table'
import { TableSkeleton, CardSkeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Download, Loader2 } from 'lucide-react'

async function fetchComplianceSummary() {
  const res = await fetch('/api/compliance/summary')
  if (!res.ok) {
    let errorData
    try {
      errorData = await res.json()
    } catch {
      errorData = { error: `HTTP ${res.status}: ${res.statusText}` }
    }
    const errorMessage = errorData.error || errorData.details || `Failed to fetch compliance summary: ${res.status} ${res.statusText}`
    throw new Error(errorMessage)
  }
  const data = await res.json()
  if (!data.success) {
    throw new Error(data.error || 'Failed to fetch compliance summary')
  }
  return data.data
}

async function fetchComplianceDrivers(status?: string, search?: string) {
  const params = new URLSearchParams()
  if (status) params.set('status', status)
  if (search) params.set('search', search)
  const res = await fetch(`/api/compliance/drivers?${params.toString()}`)
  if (!res.ok) {
    let errorData
    try {
      errorData = await res.json()
    } catch {
      errorData = { error: `HTTP ${res.status}: ${res.statusText}` }
    }
    const errorMessage = errorData.error || errorData.details || `Failed to fetch driver compliance: ${res.status} ${res.statusText}`
    throw new Error(errorMessage)
  }
  const data = await res.json()
  if (!data.success) {
    throw new Error(data.error || 'Failed to fetch driver compliance')
  }
  return data.data
}

export function CompliancePageClient() {
  const queryClient = useQueryClient()
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [isExporting, setIsExporting] = useState(false)
  
  const summaryQuery = useQuery({
    queryKey: ['compliance-summary'],
    queryFn: fetchComplianceSummary,
    // CRITICAL: Use cache immediately on mount if available
    initialData: () => {
      return queryClient.getQueryData(['compliance-summary']) as any
    },
    initialDataUpdatedAt: () => {
      return queryClient.getQueryState(['compliance-summary'])?.dataUpdatedAt
    },
    placeholderData: (previousData) => previousData,
    retry: 1,
  })
  
  const driversQuery = useQuery({
    queryKey: ['compliance-drivers', statusFilter, searchQuery],
    queryFn: () => fetchComplianceDrivers(
      statusFilter === 'all' ? undefined : statusFilter,
      searchQuery || undefined
    ),
    // Don't use initialData - let React Query handle cache naturally
    // This ensures isPending is true when query key changes and no cache exists
    retry: 1,
  })
  
  // Log errors (React Query v5 doesn't support onError in useQuery)
  if (summaryQuery.error && process.env.NODE_ENV === 'development') {
    console.error('Error fetching compliance summary:', summaryQuery.error)
  }
  if (driversQuery.error && process.env.NODE_ENV === 'development') {
    console.error('Error fetching driver compliance:', driversQuery.error)
  }
  
  // Show loading when fetching (including when filters change)
  const hasSummaryData = !!summaryQuery.data
  const summaryLoading = (summaryQuery.isFetching && !hasSummaryData) || (summaryQuery.isPending && !hasSummaryData)
  
  // For drivers: show skeleton when fetching new data (filter/search changed)
  // isPending = waiting for initial data (new query key, no cache)
  // isFetching = actively fetching (could be new query or background refetch)
  // Show skeleton when pending (new query) OR when fetching and we don't have data yet
  const driversLoading = driversQuery.isPending || (driversQuery.isFetching && driversQuery.data === undefined)
  
  const summary = summaryQuery.data
  
  // Debug logging (only in development)
  if (process.env.NODE_ENV === 'development') {
    console.log('📊 Compliance Page State:', {
      summaryLoading,
      driversLoading,
      hasSummaryData,
      hasDriversData: driversQuery.data !== undefined,
      summary: summary ? {
        totalDrivers: summary.totalDrivers,
        compliantDrivers: summary.compliantDrivers,
        compliancePercentage: summary.compliancePercentage
      } : null,
      driversCount: driversQuery.data?.length ?? 0,
      summaryError: summaryQuery.error,
      driversError: driversQuery.error,
    })
  }
  
  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      {summaryQuery.error ? (
        <div className="p-4 bg-slate-50 border border-slate-300 rounded-md">
          <div className="flex items-start gap-3">
            <div className="shrink-0">
              <svg className="h-5 w-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-900">
                Unable to Load Compliance Summary
              </p>
              <p className="text-sm text-slate-600 mt-1">
                {summaryQuery.error instanceof Error 
                  ? summaryQuery.error.message 
                  : 'An unexpected error occurred. Please try refreshing the page.'}
              </p>
              <button
                onClick={() => summaryQuery.refetch()}
                className="mt-3 text-sm text-slate-900 font-medium hover:text-slate-700 underline"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      ) : summaryLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : summary ? (
        <ComplianceSummaryCards summary={summary} />
      ) : (
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-md">
          <p className="text-sm text-slate-600">
            No compliance data available. Make sure you have drivers and compliance documents in the system.
          </p>
        </div>
      )}
      
      {/* Drivers Compliance Table */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-slate-900 mb-4">Driver Compliance</h2>
          
          {/* Filters */}
          <div className="flex gap-4 items-center mb-4">
            <div className="flex gap-2">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-4 py-2 rounded-md text-sm font-medium ${
                  statusFilter === 'all'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setStatusFilter('compliant')}
                className={`px-4 py-2 rounded-md text-sm font-medium ${
                  statusFilter === 'compliant'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Compliant
              </button>
              <button
                onClick={() => setStatusFilter('non_compliant')}
                className={`px-4 py-2 rounded-md text-sm font-medium ${
                  statusFilter === 'non_compliant'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Non-Compliant
              </button>
            </div>
            
            <input
              type="text"
              placeholder="Search drivers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="px-4 py-2 border border-slate-300 rounded-md text-sm flex-1 max-w-xs"
            />
            
            <Button
              onClick={async () => {
                setIsExporting(true)
                try {
                  const response = await fetch('/api/compliance/report?format=csv')
                  if (!response.ok) {
                    throw new Error('Failed to export CSV')
                  }
                  const blob = await response.blob()
                  const url = window.URL.createObjectURL(blob)
                  const a = document.createElement('a')
                  a.href = url
                  a.download = `compliance-report-${new Date().toISOString().split('T')[0]}.csv`
                  document.body.appendChild(a)
                  a.click()
                  window.URL.revokeObjectURL(url)
                  document.body.removeChild(a)
                } catch (error) {
                  console.error('Error exporting CSV:', error)
                  alert('Failed to export CSV. Please try again.')
                } finally {
                  setIsExporting(false)
                }
              }}
              disabled={isExporting}
              className="px-4 py-2 bg-slate-900 text-white rounded-md text-sm font-medium hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isExporting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </>
              )}
            </Button>
          </div>
        </div>
        
        {driversQuery.error ? (
          <div className="p-4 bg-slate-50 border border-slate-300 rounded-md">
            <div className="flex items-start gap-3">
              <div className="shrink-0">
                <svg className="h-5 w-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-900">
                  Unable to Load Driver Compliance Data
                </p>
                <p className="text-sm text-slate-600 mt-1">
                  {driversQuery.error instanceof Error 
                    ? driversQuery.error.message 
                    : 'An unexpected error occurred. Please try refreshing the page.'}
                </p>
                <button
                  onClick={() => driversQuery.refetch()}
                  className="mt-3 text-sm text-slate-900 font-medium hover:text-slate-700 underline"
                >
                  Try Again
                </button>
              </div>
            </div>
          </div>
        ) : driversLoading ? (
          <TableSkeleton />
        ) : (
          <ComplianceDriversTable drivers={driversQuery.data || []} />
        )}
      </div>
      
      {/* Expiring Documents Table */}
      {summary && (
        <ComplianceExpiringTable summary={summary} />
      )}
    </div>
  )
}
