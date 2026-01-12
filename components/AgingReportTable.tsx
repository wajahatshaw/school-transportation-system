'use client'

import { useQuery } from '@tanstack/react-query'
import { EmptyState } from '@/components/ui/empty-state'

export function AgingReportTable() {
  const reportQuery = useQuery({
    queryKey: ['aging-report'],
    queryFn: async () => {
      const response = await fetch('/api/payments/aging')
      if (!response.ok) throw new Error('Failed to fetch aging report')
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

  const formatDate = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
  }

  if (reportQuery.isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-slate-200 rounded w-1/3"></div>
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 bg-slate-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (reportQuery.error) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
        <p className="text-sm text-red-600">Failed to load aging report</p>
      </div>
    )
  }

  const report = reportQuery.data || []

  if (report.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
        <EmptyState
          icon={<div className="text-6xl">📊</div>}
          title="No outstanding invoices"
          description="All invoices are paid or cancelled."
        />
      </div>
    )
  }

  // Calculate totals by bucket
  const totals = {
    current: report.filter((r: any) => r.agingBucket === 'current')
      .reduce((sum: number, r: any) => sum + r.outstandingAmount, 0),
    '31-60': report.filter((r: any) => r.agingBucket === '31-60')
      .reduce((sum: number, r: any) => sum + r.outstandingAmount, 0),
    '61-90': report.filter((r: any) => r.agingBucket === '61-90')
      .reduce((sum: number, r: any) => sum + r.outstandingAmount, 0),
    '90+': report.filter((r: any) => r.agingBucket === '90+')
      .reduce((sum: number, r: any) => sum + r.outstandingAmount, 0),
    total: report.reduce((sum: number, r: any) => sum + r.outstandingAmount, 0)
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Invoice #
              </th>
              <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Due Date
              </th>
              <th className="px-6 py-3.5 text-right text-xs font-semibold text-slate-700 uppercase tracking-wider">
                <div className="flex flex-col">
                  <span>Current</span>
                  <span className="text-xs font-normal text-slate-500">(0-30 days)</span>
                </div>
              </th>
              <th className="px-6 py-3.5 text-right text-xs font-semibold text-slate-700 uppercase tracking-wider">
                <div className="flex flex-col">
                  <span>31-60 Days</span>
                  <span className="text-xs font-normal text-slate-500">Past Due</span>
                </div>
              </th>
              <th className="px-6 py-3.5 text-right text-xs font-semibold text-slate-700 uppercase tracking-wider">
                <div className="flex flex-col">
                  <span>61-90 Days</span>
                  <span className="text-xs font-normal text-slate-500">Past Due</span>
                </div>
              </th>
              <th className="px-6 py-3.5 text-right text-xs font-semibold text-slate-700 uppercase tracking-wider">
                <div className="flex flex-col">
                  <span>90+ Days</span>
                  <span className="text-xs font-normal text-slate-500">Past Due</span>
                </div>
              </th>
              <th className="px-6 py-3.5 text-right text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Total Outstanding
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-200">
            {report.map((item: any) => {
              const current = item.agingBucket === 'current' ? item.outstandingAmount : 0
              const days31_60 = item.agingBucket === '31-60' ? item.outstandingAmount : 0
              const days61_90 = item.agingBucket === '61-90' ? item.outstandingAmount : 0
              const days90Plus = item.agingBucket === '90+' ? item.outstandingAmount : 0

              return (
                <tr key={item.invoiceId} className="transition-all duration-150 hover:bg-slate-50 border-b border-slate-100">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-semibold text-slate-900">
                      {item.invoiceNumber}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-slate-700">
                      {formatDate(item.dueDate)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className={`text-sm font-medium ${current > 0 ? 'text-green-600' : 'text-slate-400'}`}>
                      {current > 0 ? formatCurrency(current) : '—'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className={`text-sm font-medium ${days31_60 > 0 ? 'text-yellow-600' : 'text-slate-400'}`}>
                      {days31_60 > 0 ? formatCurrency(days31_60) : '—'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className={`text-sm font-medium ${days61_90 > 0 ? 'text-orange-600' : 'text-slate-400'}`}>
                      {days61_90 > 0 ? formatCurrency(days61_90) : '—'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className={`text-sm font-medium ${days90Plus > 0 ? 'text-red-600' : 'text-slate-400'}`}>
                      {days90Plus > 0 ? formatCurrency(days90Plus) : '—'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="text-sm font-semibold text-slate-900">
                      {formatCurrency(item.outstandingAmount)}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
          <tfoot className="bg-slate-50 border-t-2 border-slate-300">
            <tr>
              <td colSpan={2} className="px-6 py-4 text-sm font-bold text-slate-900">
                Totals
              </td>
              <td className="px-6 py-4 text-sm text-right font-bold text-green-600">
                {formatCurrency(totals.current)}
              </td>
              <td className="px-6 py-4 text-sm text-right font-bold text-yellow-600">
                {formatCurrency(totals['31-60'])}
              </td>
              <td className="px-6 py-4 text-sm text-right font-bold text-orange-600">
                {formatCurrency(totals['61-90'])}
              </td>
              <td className="px-6 py-4 text-sm text-right font-bold text-red-600">
                {formatCurrency(totals['90+'])}
              </td>
              <td className="px-6 py-4 text-sm text-right font-bold text-slate-900">
                {formatCurrency(totals.total)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}
