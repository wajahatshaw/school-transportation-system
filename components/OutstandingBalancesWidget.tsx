'use client'

import { useQuery } from '@tanstack/react-query'
import { DollarSign, AlertCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

export function OutstandingBalancesWidget() {
  const balancesQuery = useQuery({
    queryKey: ['outstanding-balances'],
    queryFn: async () => {
      const response = await fetch('/api/payments/outstanding')
      if (!response.ok) throw new Error('Failed to fetch outstanding balances')
      const data = await response.json()
      return data.data
    },
  })

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  if (balancesQuery.isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-slate-200 rounded w-1/3"></div>
          <div className="h-8 bg-slate-200 rounded w-1/2"></div>
        </div>
      </div>
    )
  }

  if (balancesQuery.error) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
        <p className="text-sm text-red-600">Failed to load outstanding balances</p>
      </div>
    )
  }

  const balances = balancesQuery.data || { totalOutstanding: 0, byStatus: {} }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent':
        return 'bg-blue-100 text-blue-800'
      case 'overdue':
        return 'bg-red-100 text-red-800'
      case 'draft':
        return 'bg-slate-100 text-slate-800'
      default:
        return 'bg-slate-100 text-slate-800'
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
          <DollarSign className="h-5 w-5 text-red-600" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Outstanding Balances</h3>
          <p className="text-sm text-slate-600">Amounts awaiting payment</p>
        </div>
      </div>
      
      <div className="space-y-6">
        <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
          <p className="text-sm font-medium text-slate-600 mb-1">Total Outstanding</p>
          <p className="text-3xl font-bold text-red-600">
            {formatCurrency(balances.totalOutstanding)}
          </p>
        </div>

        {Object.keys(balances.byStatus || {}).length > 0 && (
          <div className="border-t border-slate-200 pt-4">
            <p className="text-sm font-semibold text-slate-900 mb-3">Breakdown by Status</p>
            <div className="space-y-3">
              {Object.entries(balances.byStatus).map(([status, amount]: [string, any]) => (
                <div key={status} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="flex items-center gap-2">
                    <Badge className={getStatusColor(status)}>
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </Badge>
                  </div>
                  <span className="text-lg font-semibold text-slate-900">
                    {formatCurrency(Number(amount))}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {balances.totalOutstanding === 0 && (
          <div className="text-center py-8">
            <div className="flex justify-center mb-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
            </div>
            <p className="text-sm font-medium text-slate-900">All invoices are paid</p>
            <p className="text-sm text-slate-600 mt-1">No outstanding balances</p>
          </div>
        )}
      </div>
    </div>
  )
}
