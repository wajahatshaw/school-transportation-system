'use client'

import { useState } from 'react'
import { Eye, Pencil, CreditCard, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { InvoiceDetailModal } from './InvoiceDetailModal'
import { RecordPaymentModal } from './RecordPaymentModal'
import { EditInvoiceModal } from './EditInvoiceModal'
import { DeleteConfirmDialog } from './DeleteConfirmDialog'

interface Invoice {
  id: string
  invoiceNumber: string
  status: string
  issueDate: Date
  dueDate: Date
  total: number
  outstandingAmount: number
  createdAt: Date | null
}

interface InvoicesTableProps {
  invoices: Invoice[]
  onUpdate?: () => void
}

export function InvoicesTable({ invoices, onUpdate }: InvoicesTableProps) {
  const [viewingInvoice, setViewingInvoice] = useState<string | null>(null)
  const [recordingPayment, setRecordingPayment] = useState<string | null>(null)
  const [editingInvoice, setEditingInvoice] = useState<string | null>(null)
  const [deletingInvoice, setDeletingInvoice] = useState<string | null>(null)

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return <Badge variant="secondary">Draft</Badge>
      case 'sent':
        return <Badge variant="outline">Sent</Badge>
      case 'paid':
        return <Badge variant="success">Paid</Badge>
      case 'overdue':
        return <Badge variant="danger">Overdue</Badge>
      case 'cancelled':
        return <Badge variant="secondary">Cancelled</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const formatDate = (date: Date | string | null) => {
    if (!date) return '—'
    const d = typeof date === 'string' ? new Date(date) : date
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
  }

  const handleDelete = async () => {
    if (!deletingInvoice) return
    
    try {
      const response = await fetch(`/api/invoices/${deletingInvoice}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        }
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(errorData.error || `Failed to cancel invoice: ${response.statusText}`)
      }

      const result = await response.json()
      toast.success('Invoice cancelled successfully')
      setDeletingInvoice(null)
      if (onUpdate) onUpdate()
    } catch (error: any) {
      console.error('Delete error:', error)
      toast.error('Failed to cancel invoice', {
        description: error.message || 'Please try again'
      })
      // Don't clear deletingInvoice on error so user can try again
    }
  }

  const canEditOrDelete = (invoice: Invoice) => {
    return invoice.status !== 'paid' && invoice.status !== 'cancelled'
  }

  if (invoices.length === 0) {
    return (
      <EmptyState
        icon={<div className="text-6xl">📄</div>}
        title="No invoices yet"
        description="Get started by creating your first invoice."
      />
    )
  }

  return (
    <>
      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 lg:px-6 py-2.5 lg:py-3.5 text-left text-[10px] lg:text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Invoice #
              </th>
              <th className="px-4 lg:px-6 py-2.5 lg:py-3.5 text-left text-[10px] lg:text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Issue Date
              </th>
              <th className="px-4 lg:px-6 py-2.5 lg:py-3.5 text-left text-[10px] lg:text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Due Date
              </th>
              <th className="px-4 lg:px-6 py-2.5 lg:py-3.5 text-left text-[10px] lg:text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Status
              </th>
              <th className="px-4 lg:px-6 py-2.5 lg:py-3.5 text-right text-[10px] lg:text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Total
              </th>
              <th className="px-4 lg:px-6 py-2.5 lg:py-3.5 text-right text-[10px] lg:text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Outstanding
              </th>
              <th className="px-4 lg:px-6 py-2.5 lg:py-3.5 text-center text-[10px] lg:text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-200">
            {invoices.map((invoice) => (
              <tr
                key={invoice.id}
                className="transition-all duration-150 hover:bg-slate-50 border-b border-slate-100"
              >
                <td className="px-4 lg:px-6 py-3 lg:py-4 whitespace-nowrap">
                  <div className="text-xs lg:text-sm font-semibold text-slate-900">
                    {invoice.invoiceNumber}
                  </div>
                </td>
                <td className="px-4 lg:px-6 py-3 lg:py-4 whitespace-nowrap">
                  <div className="text-xs lg:text-sm text-slate-700">
                    {formatDate(invoice.issueDate)}
                  </div>
                </td>
                <td className="px-4 lg:px-6 py-3 lg:py-4 whitespace-nowrap">
                  <div className="text-xs lg:text-sm text-slate-700">
                    {formatDate(invoice.dueDate)}
                  </div>
                </td>
                <td className="px-4 lg:px-6 py-3 lg:py-4 whitespace-nowrap">
                  {getStatusBadge(invoice.status)}
                </td>
                <td className="px-4 lg:px-6 py-3 lg:py-4 whitespace-nowrap text-right">
                  <div className="text-xs lg:text-sm font-semibold text-slate-900">
                    {formatCurrency(invoice.total)}
                  </div>
                </td>
                <td className="px-4 lg:px-6 py-3 lg:py-4 whitespace-nowrap text-right">
                  <div className={`text-xs lg:text-sm font-semibold ${
                    invoice.outstandingAmount > 0 ? 'text-red-600' : 'text-green-600'
                  }`}>
                    {formatCurrency(invoice.outstandingAmount)}
                  </div>
                </td>
                <td className="px-4 lg:px-6 py-3 lg:py-4 whitespace-nowrap">
                  <div className="flex items-center justify-center gap-1 sm:gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setViewingInvoice(invoice.id)}
                      className="h-7 w-7 lg:h-8 lg:w-8 p-0 border-slate-300 hover:bg-slate-100 hover:border-slate-400"
                      title="View Details"
                    >
                      <Eye className="h-3 w-3 lg:h-4 lg:w-4" />
                    </Button>
                    {canEditOrDelete(invoice) && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingInvoice(invoice.id)}
                          className="h-7 w-7 lg:h-8 lg:w-8 p-0 border-slate-300 hover:bg-blue-50 hover:border-blue-400 hover:text-blue-600"
                          title="Edit Invoice"
                        >
                          <Pencil className="h-3 w-3 lg:h-4 lg:w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setRecordingPayment(invoice.id)}
                          className="h-7 w-7 lg:h-8 lg:w-8 p-0 border-slate-300 hover:bg-green-50 hover:border-green-400 hover:text-green-600"
                          title="Record Payment"
                        >
                          <CreditCard className="h-3 w-3 lg:h-4 lg:w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setDeletingInvoice(invoice.id)}
                          className="h-7 w-7 lg:h-8 lg:w-8 p-0 border-slate-300 hover:bg-red-50 hover:border-red-400 hover:text-red-600"
                          title="Cancel Invoice"
                        >
                          <Trash2 className="h-3 w-3 lg:h-4 lg:w-4" />
                        </Button>
                      </>
                    )}
                    {invoice.status === 'paid' && (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled
                        className="h-7 w-7 lg:h-8 lg:w-8 p-0 border-slate-200 bg-slate-50 cursor-not-allowed opacity-50"
                        title="Invoice is paid and cannot be edited"
                      >
                        <Pencil className="h-3 w-3 lg:h-4 lg:w-4" />
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-3">
        {invoices.map((invoice) => (
          <div
            key={invoice.id}
            className="bg-white border border-slate-200 rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-slate-900 truncate">
                  {invoice.invoiceNumber}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  {getStatusBadge(invoice.status)}
                </div>
              </div>
              <div className="flex items-center gap-1 ml-2 flex-shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setViewingInvoice(invoice.id)}
                  className="h-7 w-7 p-0 border-slate-300 hover:bg-slate-100"
                  title="View"
                >
                  <Eye className="h-3.5 w-3.5" />
                </Button>
                {canEditOrDelete(invoice) && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingInvoice(invoice.id)}
                    className="h-7 w-7 p-0 border-slate-300 hover:bg-blue-50"
                    title="Edit"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs mt-2 pt-2 border-t border-slate-100">
              <div>
                <span className="text-slate-500">Issue:</span>
                <span className="ml-1 text-slate-700 font-medium">{formatDate(invoice.issueDate)}</span>
              </div>
              <div>
                <span className="text-slate-500">Due:</span>
                <span className="ml-1 text-slate-700 font-medium">{formatDate(invoice.dueDate)}</span>
              </div>
              <div>
                <span className="text-slate-500">Total:</span>
                <span className="ml-1 text-slate-900 font-semibold">{formatCurrency(invoice.total)}</span>
              </div>
              <div>
                <span className="text-slate-500">Outstanding:</span>
                <span className={`ml-1 font-semibold ${
                  invoice.outstandingAmount > 0 ? 'text-red-600' : 'text-green-600'
                }`}>
                  {formatCurrency(invoice.outstandingAmount)}
                </span>
              </div>
            </div>
            {canEditOrDelete(invoice) && (
              <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-slate-100">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setRecordingPayment(invoice.id)}
                  className="flex-1 h-8 text-xs border-slate-300 hover:bg-green-50"
                >
                  <CreditCard className="h-3.5 w-3.5 mr-1.5" />
                  Payment
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDeletingInvoice(invoice.id)}
                  className="h-8 w-8 p-0 border-red-300 text-red-600 hover:bg-red-50"
                  title="Cancel"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>

      {viewingInvoice && (
        <InvoiceDetailModal
          invoiceId={viewingInvoice}
          isOpen={!!viewingInvoice}
          onClose={() => {
            setViewingInvoice(null)
            if (onUpdate) onUpdate()
          }}
          onRecordPayment={(invoiceId) => {
            setViewingInvoice(null)
            setRecordingPayment(invoiceId)
          }}
        />
      )}

      {recordingPayment && (
        <RecordPaymentModal
          invoiceId={recordingPayment}
          isOpen={!!recordingPayment}
          onClose={() => {
            setRecordingPayment(null)
            if (onUpdate) onUpdate()
          }}
        />
      )}

      {editingInvoice && (
        <EditInvoiceModal
          isOpen={!!editingInvoice}
          invoiceId={editingInvoice}
          onClose={() => {
            setEditingInvoice(null)
            if (onUpdate) onUpdate()
          }}
          onSuccess={() => {
            setEditingInvoice(null)
            if (onUpdate) onUpdate()
          }}
        />
      )}

      {deletingInvoice && (
        <DeleteConfirmDialog
          title="Cancel Invoice"
          description="Are you sure you want to cancel this invoice? This action cannot be undone."
          onConfirm={handleDelete}
          onCancel={() => setDeletingInvoice(null)}
        />
      )}
    </>
  )
}
