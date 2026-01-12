'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Plus, CreditCard, FileText, DollarSign, AlertCircle, TrendingUp, Receipt, ChevronDown, ChevronUp } from 'lucide-react'
import { InvoicesTable } from '@/components/InvoicesTable'
import { CreateInvoiceModal } from '@/components/CreateInvoiceModal'
import { OutstandingBalancesWidget } from '@/components/OutstandingBalancesWidget'
import { AgingReportTable } from '@/components/AgingReportTable'
import { CardSkeleton, TableSkeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'

async function fetchPaymentsSummary() {
  const res = await fetch('/api/payments/summary')
  if (!res.ok) {
    throw new Error('Failed to fetch payments summary')
  }
  const data = await res.json()
  return data.data
}

async function fetchInvoices(status?: string) {
  const params = new URLSearchParams()
  if (status) params.set('status', status)
  const res = await fetch(`/api/invoices?${params.toString()}`)
  if (!res.ok) {
    throw new Error('Failed to fetch invoices')
  }
  const data = await res.json()
  return data.data
}

export function PaymentsPageClient() {
  const queryClient = useQueryClient()
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isFiltersOpen, setIsFiltersOpen] = useState(false)

  const summaryQuery = useQuery({
    queryKey: ['payments-summary'],
    queryFn: fetchPaymentsSummary,
    placeholderData: (previousData) => previousData,
    staleTime: 0,
    gcTime: 5 * 60 * 1000,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    refetchInterval: 60000,
    retry: 1,
  })

  const invoicesQuery = useQuery({
    queryKey: ['invoices', statusFilter],
    queryFn: () => fetchInvoices(statusFilter === 'all' ? undefined : statusFilter),
    placeholderData: (previousData) => {
      const cachedData = queryClient.getQueryData(['invoices', statusFilter])
      return cachedData || undefined
    },
    staleTime: 0,
    gcTime: 5 * 60 * 1000,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    retry: 1,
  })

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['payments-summary'] })
    queryClient.invalidateQueries({ queryKey: ['invoices'] })
    queryClient.invalidateQueries({ queryKey: ['outstanding-balances'] })
    queryClient.invalidateQueries({ queryKey: ['aging-report'] })
  }

  const summaryLoading = summaryQuery.isPending && !summaryQuery.data
  const invoicesLoading = (invoicesQuery.isPending || invoicesQuery.isFetching) && !invoicesQuery.data

  const summary = summaryQuery.data || {
    totalInvoices: 0,
    totalPaid: 0,
    totalOutstanding: 0,
    overdueCount: 0
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      {summaryLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-3 sm:p-4 lg:p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="flex h-8 w-8 sm:h-10 sm:w-10 lg:h-12 lg:w-12 items-center justify-center rounded-full bg-slate-100 flex-shrink-0">
                <FileText className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-slate-700" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-slate-600">Total Invoices</p>
                <p className="text-lg sm:text-xl lg:text-2xl font-bold text-slate-900 mt-0.5 sm:mt-1 truncate">{summary.totalInvoices}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-3 sm:p-4 lg:p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="flex h-8 w-8 sm:h-10 sm:w-10 lg:h-12 lg:w-12 items-center justify-center rounded-full bg-green-100 flex-shrink-0">
                <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-green-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-slate-600">Total Paid</p>
                <p className="text-lg sm:text-xl lg:text-2xl font-bold text-green-600 mt-0.5 sm:mt-1 truncate">{formatCurrency(summary.totalPaid)}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-3 sm:p-4 lg:p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="flex h-8 w-8 sm:h-10 sm:w-10 lg:h-12 lg:w-12 items-center justify-center rounded-full bg-red-100 flex-shrink-0">
                <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-red-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-slate-600">Outstanding</p>
                <p className="text-lg sm:text-xl lg:text-2xl font-bold text-red-600 mt-0.5 sm:mt-1 truncate">{formatCurrency(summary.totalOutstanding)}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-3 sm:p-4 lg:p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="flex h-8 w-8 sm:h-10 sm:w-10 lg:h-12 lg:w-12 items-center justify-center rounded-full bg-orange-100 flex-shrink-0">
                <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-orange-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-slate-600">Overdue</p>
                <p className="text-lg sm:text-xl lg:text-2xl font-bold text-orange-600 mt-0.5 sm:mt-1 truncate">{summary.overdueCount}</p>
                <p className="text-[10px] sm:text-xs text-slate-500 mt-0.5 sm:mt-1 hidden sm:block">Requires attention</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Outstanding Balances Widget */}
      <div className="mt-6">
        <OutstandingBalancesWidget />
      </div>

      {/* Invoices Section */}
      <div className="mt-4 sm:mt-6 bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-lg sm:text-xl font-semibold text-slate-900 flex items-center gap-2">
                <Receipt className="h-4 w-4 sm:h-5 sm:w-5 text-slate-700" />
                Invoices
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 mt-1">
                Manage and track all your invoices
              </p>
            </div>
            <Button 
              onClick={() => setIsCreateModalOpen(true)}
              className="bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm px-3 sm:px-4 py-1.5 sm:py-2 w-full sm:w-auto"
            >
              <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
              <span className="hidden sm:inline">Create Invoice</span>
              <span className="sm:hidden">Create</span>
            </Button>
          </div>
        </div>

        <div className="p-3 sm:p-4 lg:p-6">
          {/* Mobile: Collapsible Filter Header */}
          <button
            onClick={() => setIsFiltersOpen(!isFiltersOpen)}
            className="w-full sm:hidden flex items-center justify-between mb-3 pb-3 border-b border-slate-200"
          >
            <span className="text-xs font-medium text-slate-700">Filter: {statusFilter === 'all' ? 'All' : statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)}</span>
            {isFiltersOpen ? (
              <ChevronUp className="h-4 w-4 text-slate-600" />
            ) : (
              <ChevronDown className="h-4 w-4 text-slate-600" />
            )}
          </button>

          {/* Filter Buttons */}
          <div className={`${isFiltersOpen ? 'block' : 'hidden'} sm:flex sm:flex-row sm:items-center gap-2 sm:gap-2 mb-4 sm:mb-6 pb-3 sm:pb-4 border-b border-slate-200`}>
            <span className="hidden sm:inline text-xs sm:text-sm font-medium text-slate-700 sm:mr-2">Filter:</span>
            <div className="flex flex-wrap gap-1.5 sm:gap-2">
              <Button
                variant={statusFilter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('all')}
                className={`text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-1.5 h-7 sm:h-8 ${
                  statusFilter === 'all' 
                    ? 'bg-slate-900 text-white hover:bg-slate-800' 
                    : 'bg-white hover:bg-slate-50'
                }`}
              >
                All
              </Button>
              <Button
                variant={statusFilter === 'draft' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('draft')}
                className={`text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-1.5 h-7 sm:h-8 ${
                  statusFilter === 'draft' 
                    ? 'bg-slate-900 text-white hover:bg-slate-800' 
                    : 'bg-white hover:bg-slate-50'
                }`}
              >
                Draft
              </Button>
              <Button
                variant={statusFilter === 'sent' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('sent')}
                className={`text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-1.5 h-7 sm:h-8 ${
                  statusFilter === 'sent' 
                    ? 'bg-slate-900 text-white hover:bg-slate-800' 
                    : 'bg-white hover:bg-slate-50'
                }`}
              >
                Sent
              </Button>
              <Button
                variant={statusFilter === 'paid' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('paid')}
                className={`text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-1.5 h-7 sm:h-8 ${
                  statusFilter === 'paid' 
                    ? 'bg-slate-900 text-white hover:bg-slate-800' 
                    : 'bg-white hover:bg-slate-50'
                }`}
              >
                Paid
              </Button>
              <Button
                variant={statusFilter === 'overdue' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('overdue')}
                className={`text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-1.5 h-7 sm:h-8 ${
                  statusFilter === 'overdue' 
                    ? 'bg-slate-900 text-white hover:bg-slate-800' 
                    : 'bg-white hover:bg-slate-50'
                }`}
              >
                Overdue
              </Button>
            </div>
          </div>

          {/* Table */}
          {invoicesLoading ? (
            <TableSkeleton />
          ) : (
            <InvoicesTable
              invoices={invoicesQuery.data || []}
              onUpdate={handleRefresh}
            />
          )}
        </div>
      </div>

      {/* Aging Report */}
      <div className="mt-4 sm:mt-6">
        <div className="mb-3 sm:mb-4">
          <h2 className="text-lg sm:text-xl font-semibold text-slate-900 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-slate-700" />
            Aging Report
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            Track outstanding invoices by days past due
          </p>
        </div>
        <AgingReportTable />
      </div>

      <CreateInvoiceModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={handleRefresh}
      />
    </div>
  )
}
