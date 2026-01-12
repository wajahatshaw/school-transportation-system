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
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Invoice #
              </th>
              <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Issue Date
              </th>
              <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Due Date
              </th>
              <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3.5 text-right text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Total
              </th>
              <th className="px-6 py-3.5 text-right text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Outstanding
              </th>
              <th className="px-6 py-3.5 text-center text-xs font-semibold text-slate-700 uppercase tracking-wider">
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
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="text-sm font-semibold text-slate-900">
                      {invoice.invoiceNumber}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-slate-700">
                    {formatDate(invoice.issueDate)}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-slate-700">
                    {formatDate(invoice.dueDate)}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {getStatusBadge(invoice.status)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  <div className="text-sm font-semibold text-slate-900">
                    {formatCurrency(invoice.total)}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  <div className={`text-sm font-semibold ${
                    invoice.outstandingAmount > 0 ? 'text-red-600' : 'text-green-600'
                  }`}>
                    {formatCurrency(invoice.outstandingAmount)}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center justify-center gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setViewingInvoice(invoice.id)}
                      className="h-8 w-8 p-0 border-slate-300 hover:bg-slate-100 hover:border-slate-400"
                      title="View Details"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    {canEditOrDelete(invoice) && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingInvoice(invoice.id)}
                          className="h-8 w-8 p-0 border-slate-300 hover:bg-blue-50 hover:border-blue-400 hover:text-blue-600"
                          title="Edit Invoice"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setRecordingPayment(invoice.id)}
                          className="h-8 w-8 p-0 border-slate-300 hover:bg-green-50 hover:border-green-400 hover:text-green-600"
                          title="Record Payment"
                        >
                          <CreditCard className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setDeletingInvoice(invoice.id)}
                          className="h-8 w-8 p-0 border-slate-300 hover:bg-red-50 hover:border-red-400 hover:text-red-600"
                          title="Cancel Invoice"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                    {invoice.status === 'paid' && (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled
                        className="h-8 w-8 p-0 border-slate-200 bg-slate-50 cursor-not-allowed opacity-50"
                        title="Invoice is paid and cannot be edited"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
