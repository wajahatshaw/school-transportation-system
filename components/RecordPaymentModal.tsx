'use client'

import { useState, useTransition } from 'react'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input, Label } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

interface RecordPaymentModalProps {
  invoiceId: string
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

export function RecordPaymentModal({ invoiceId, isOpen, onClose, onSuccess }: RecordPaymentModalProps) {
  const [isPending, startTransition] = useTransition()
  const [formData, setFormData] = useState({
    amount: '',
    paymentDate: new Date().toISOString().split('T')[0],
    paymentMethod: 'cash',
    referenceNumber: '',
    notes: ''
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const newErrors: Record<string, string> = {}
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      newErrors.amount = 'Amount must be greater than 0'
    }
    if (!formData.paymentDate) {
      newErrors.paymentDate = 'Payment date is required'
    }
    if (!formData.paymentMethod) {
      newErrors.paymentMethod = 'Payment method is required'
    }

    if (invoiceQuery.data) {
      const amount = parseFloat(formData.amount)
      if (amount > invoiceQuery.data.outstandingAmount) {
        newErrors.amount = `Amount cannot exceed outstanding balance of $${invoiceQuery.data.outstandingAmount.toFixed(2)}`
      }
    }

    setErrors(newErrors)
    if (Object.keys(newErrors).length > 0) return

    startTransition(async () => {
      try {
        const response = await fetch(`/api/invoices/${invoiceId}/payments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: parseFloat(formData.amount),
            paymentDate: formData.paymentDate,
            paymentMethod: formData.paymentMethod,
            referenceNumber: formData.referenceNumber || undefined,
            notes: formData.notes || undefined
          })
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Failed to record payment')
        }

        toast.success('Payment recorded successfully')
        setFormData({
          amount: '',
          paymentDate: new Date().toISOString().split('T')[0],
          paymentMethod: 'cash',
          referenceNumber: '',
          notes: ''
        })
        setErrors({})
        onClose()
        if (onSuccess) onSuccess()
      } catch (error: any) {
        toast.error('Failed to record payment', {
          description: error.message || 'Please try again'
        })
      }
    })
  }

  const outstandingAmount = invoiceQuery.data?.outstandingAmount || 0

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent onClose={onClose}>
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
          <DialogDescription>
            Record a payment for invoice {invoiceQuery.data?.invoiceNumber || invoiceId}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="amount">Amount *</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0"
              max={outstandingAmount}
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              placeholder={`Max: $${outstandingAmount.toFixed(2)}`}
              className={errors.amount ? 'border-red-500' : ''}
            />
            {errors.amount && <p className="text-sm text-red-500 mt-1">{errors.amount}</p>}
            <p className="text-xs text-slate-500 mt-1">
              Outstanding balance: ${outstandingAmount.toFixed(2)}
            </p>
          </div>

          <div>
            <Label htmlFor="paymentDate">Payment Date *</Label>
            <Input
              id="paymentDate"
              type="date"
              value={formData.paymentDate}
              onChange={(e) => setFormData({ ...formData, paymentDate: e.target.value })}
              className={errors.paymentDate ? 'border-red-500' : ''}
            />
            {errors.paymentDate && <p className="text-sm text-red-500 mt-1">{errors.paymentDate}</p>}
          </div>

          <div>
            <Label htmlFor="paymentMethod">Payment Method *</Label>
            <select
              id="paymentMethod"
              value={formData.paymentMethod}
              onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-md"
            >
              <option value="cash">Cash</option>
              <option value="check">Check</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="credit_card">Credit Card</option>
              <option value="other">Other</option>
            </select>
            {errors.paymentMethod && <p className="text-sm text-red-500 mt-1">{errors.paymentMethod}</p>}
          </div>

          <div>
            <Label htmlFor="referenceNumber">Reference Number</Label>
            <Input
              id="referenceNumber"
              value={formData.referenceNumber}
              onChange={(e) => setFormData({ ...formData, referenceNumber: e.target.value })}
              placeholder="Check number, transaction ID, etc."
            />
          </div>

          <div>
            <Label htmlFor="notes">Notes</Label>
            <Input
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Optional notes..."
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Recording...' : 'Record Payment'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
