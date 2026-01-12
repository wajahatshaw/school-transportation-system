'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { CreditCard, X } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface InvoiceDetailModalProps {
  invoiceId: string
  isOpen: boolean
  onClose: () => void
  onRecordPayment?: (invoiceId: string) => void
}

export function InvoiceDetailModal({ invoiceId, isOpen, onClose, onRecordPayment }: InvoiceDetailModalProps) {
  const invoiceQuery = useQuery({
    queryKey: ['invoice', invoiceId],
    queryFn: async () => {
      const response = await fetch(`/api/invoices/${invoiceId}`)
      if (!response.ok) throw new Error('Failed to fetch invoice')
      const data = await response.json()
      return data.data
    },
    enabled: isOpen && !!invoiceId,
  })

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const formatDate = (date: Date | string | null) => {
    if (!date) return '—'
    const d = typeof date === 'string' ? new Date(date) : date
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  }

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

  if (!invoiceQuery.data) {
    return (
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent onClose={onClose}>
          <div className="py-8 text-center">Loading...</div>
        </DialogContent>
      </Dialog>
    )
  }

  const invoice = invoiceQuery.data

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent onClose={onClose} className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Invoice Details</DialogTitle>
          <DialogDescription>
            Invoice {invoice.invoiceNumber}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-slate-500">Invoice Number</p>
              <p className="font-medium">{invoice.invoiceNumber}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Status</p>
              <div className="mt-1">{getStatusBadge(invoice.status)}</div>
            </div>
            <div>
              <p className="text-sm text-slate-500">Issue Date</p>
              <p className="font-medium">{formatDate(invoice.issueDate)}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Due Date</p>
              <p className="font-medium">{formatDate(invoice.dueDate)}</p>
            </div>
          </div>

          <div>
            <h3 className="font-medium mb-3">Line Items</h3>
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Description</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Type</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">Quantity</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">Unit Price</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">Total</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {invoice.lineItems?.map((item: any) => (
                    <tr key={item.id}>
                      <td className="px-4 py-3 text-sm">{item.description}</td>
                      <td className="px-4 py-3 text-sm text-slate-500">{item.itemType}</td>
                      <td className="px-4 py-3 text-sm text-right">{item.quantity}</td>
                      <td className="px-4 py-3 text-sm text-right">{formatCurrency(item.unitPrice)}</td>
                      <td className="px-4 py-3 text-sm text-right font-medium">{formatCurrency(item.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <h3 className="font-medium mb-3">Payments</h3>
            {invoice.payments && invoice.payments.length > 0 ? (
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Date</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Method</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Reference</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-200">
                    {invoice.payments.map((payment: any) => (
                      <tr key={payment.id}>
                        <td className="px-4 py-3 text-sm">{formatDate(payment.paymentDate)}</td>
                        <td className="px-4 py-3 text-sm text-slate-500">{payment.paymentMethod}</td>
                        <td className="px-4 py-3 text-sm text-slate-500">{payment.referenceNumber || '—'}</td>
                        <td className="px-4 py-3 text-sm text-right font-medium">{formatCurrency(payment.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-slate-500">No payments recorded</p>
            )}
          </div>

          <div className="border-t border-slate-200 pt-4 space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-slate-600">Subtotal:</span>
              <span className="text-sm font-medium">{formatCurrency(invoice.subtotal)}</span>
            </div>
            {invoice.tax && invoice.tax > 0 && (
              <div className="flex justify-between">
                <span className="text-sm text-slate-600">Tax:</span>
                <span className="text-sm font-medium">{formatCurrency(invoice.tax)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-sm text-slate-600">Total:</span>
              <span className="text-sm font-medium">{formatCurrency(invoice.total)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-slate-600">Paid:</span>
              <span className="text-sm font-medium text-green-600">{formatCurrency(invoice.paidAmount)}</span>
            </div>
            <div className="flex justify-between text-lg font-semibold border-t border-slate-200 pt-2">
              <span>Outstanding:</span>
              <span className={invoice.outstandingAmount > 0 ? 'text-red-600' : 'text-green-600'}>
                {formatCurrency(invoice.outstandingAmount)}
              </span>
            </div>
          </div>

          {invoice.notes && (
            <div>
              <p className="text-sm text-slate-500 mb-1">Notes</p>
              <p className="text-sm">{invoice.notes}</p>
            </div>
          )}
        </div>

        <DialogFooter>
          {invoice.status !== 'paid' && invoice.status !== 'cancelled' && onRecordPayment && (
            <Button
              onClick={() => {
                onRecordPayment(invoiceId)
                onClose()
              }}
            >
              <CreditCard className="h-4 w-4 mr-2" />
              Record Payment
            </Button>
          )}
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
