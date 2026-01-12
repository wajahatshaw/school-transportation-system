'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Plus, CreditCard, FileText, DollarSign, AlertCircle, TrendingUp, Receipt } from 'lucide-react'
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                <FileText className="h-6 w-6 text-slate-700" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-600">Total Invoices</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{summary.totalInvoices}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-600">Total Paid</p>
                <p className="text-2xl font-bold text-green-600 mt-1">{formatCurrency(summary.totalPaid)}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                <TrendingUp className="h-6 w-6 text-red-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-600">Outstanding</p>
                <p className="text-2xl font-bold text-red-600 mt-1">{formatCurrency(summary.totalOutstanding)}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-100">
                <AlertCircle className="h-6 w-6 text-orange-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-600">Overdue</p>
                <p className="text-2xl font-bold text-orange-600 mt-1">{summary.overdueCount}</p>
                <p className="text-xs text-slate-500 mt-1">Requires attention</p>
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
      <div className="mt-6 bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
                <Receipt className="h-5 w-5 text-slate-700" />
                Invoices
              </h2>
              <p className="text-sm text-slate-600 mt-1">
                Manage and track all your invoices
              </p>
            </div>
            <Button 
              onClick={() => setIsCreateModalOpen(true)}
              className="bg-slate-900 hover:bg-slate-800 text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Invoice
            </Button>
          </div>
        </div>

        <div className="p-6">
          {/* Filter Buttons */}
          <div className="flex items-center gap-2 mb-6 pb-4 border-b border-slate-200">
            <span className="text-sm font-medium text-slate-700 mr-2">Filter:</span>
            <Button
              variant={statusFilter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('all')}
              className={statusFilter === 'all' 
                ? 'bg-slate-900 text-white hover:bg-slate-800' 
                : 'bg-white hover:bg-slate-50'
              }
            >
              All
            </Button>
            <Button
              variant={statusFilter === 'draft' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('draft')}
              className={statusFilter === 'draft' 
                ? 'bg-slate-900 text-white hover:bg-slate-800' 
                : 'bg-white hover:bg-slate-50'
              }
            >
              Draft
            </Button>
            <Button
              variant={statusFilter === 'sent' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('sent')}
              className={statusFilter === 'sent' 
                ? 'bg-slate-900 text-white hover:bg-slate-800' 
                : 'bg-white hover:bg-slate-50'
              }
            >
              Sent
            </Button>
            <Button
              variant={statusFilter === 'paid' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('paid')}
              className={statusFilter === 'paid' 
                ? 'bg-slate-900 text-white hover:bg-slate-800' 
                : 'bg-white hover:bg-slate-50'
              }
            >
              Paid
            </Button>
            <Button
              variant={statusFilter === 'overdue' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('overdue')}
              className={statusFilter === 'overdue' 
                ? 'bg-slate-900 text-white hover:bg-slate-800' 
                : 'bg-white hover:bg-slate-50'
              }
            >
              Overdue
            </Button>
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
      <div className="mt-6">
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-slate-700" />
            Aging Report
          </h2>
          <p className="text-sm text-slate-600 mt-1">
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
