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
import { Input, Label, Select } from '@/components/ui/input'
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
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: response.statusText }))
        throw new Error(errorData.error || `Failed to fetch invoice: ${response.status}`)
      }
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
      <DialogContent onClose={onClose} className="w-[95vw] sm:w-full mx-2 sm:mx-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Record Payment</DialogTitle>
          <DialogDescription className="text-sm text-slate-600">
            Record a payment for invoice {invoiceQuery.data?.invoiceNumber || invoiceId}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="amount" className="text-sm font-medium text-slate-700">
              Amount <span className="text-red-500">*</span>
            </Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0"
              max={outstandingAmount}
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              placeholder={`Max: $${outstandingAmount.toFixed(2)}`}
              className={`h-10 ${errors.amount ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
            />
            {errors.amount && (
              <p className="text-xs text-red-500 mt-1">{errors.amount}</p>
            )}
            <p className="text-xs text-slate-500 mt-1">
              Outstanding balance: ${outstandingAmount.toFixed(2)}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="paymentDate" className="text-sm font-medium text-slate-700">
              Payment Date <span className="text-red-500">*</span>
            </Label>
            <Input
              id="paymentDate"
              type="date"
              value={formData.paymentDate}
              onChange={(e) => setFormData({ ...formData, paymentDate: e.target.value })}
              className={`h-10 ${errors.paymentDate ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
            />
            {errors.paymentDate && (
              <p className="text-xs text-red-500 mt-1">{errors.paymentDate}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="paymentMethod" className="text-sm font-medium text-slate-700">
              Payment Method <span className="text-red-500">*</span>
            </Label>
            <Select
              id="paymentMethod"
              value={formData.paymentMethod}
              onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
              className={`h-10 ${errors.paymentMethod ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
            >
              <option value="cash">Cash</option>
              <option value="check">Check</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="credit_card">Credit Card</option>
              <option value="other">Other</option>
            </Select>
            {errors.paymentMethod && (
              <p className="text-xs text-red-500 mt-1">{errors.paymentMethod}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="referenceNumber" className="text-sm font-medium text-slate-700">
              Reference Number
            </Label>
            <Input
              id="referenceNumber"
              value={formData.referenceNumber}
              onChange={(e) => setFormData({ ...formData, referenceNumber: e.target.value })}
              placeholder="Check number, transaction ID, etc."
              className="h-10"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes" className="text-sm font-medium text-slate-700">
              Notes
            </Label>
            <textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Optional notes..."
              rows={3}
              className="flex w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
            />
          </div>

          <DialogFooter className="gap-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose} 
              disabled={isPending}
              className="border-slate-300"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isPending}
              className="bg-slate-900 hover:bg-slate-800 text-white"
            >
              {isPending ? 'Recording...' : 'Record Payment'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
