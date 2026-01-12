'use client'

import { useState, useTransition } from 'react'
import { Plus, X, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useQuery } from '@tanstack/react-query'
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
import { getRoutes, getStudents } from '@/lib/actions'

interface CreateInvoiceModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

interface LineItem {
  id: string
  itemType: 'route' | 'student' | 'route-day'
  routeId?: string
  studentId?: string
  description: string
  quantity: number
  unitPrice: number
  total: number
}

export function CreateInvoiceModal({ isOpen, onClose, onSuccess }: CreateInvoiceModalProps) {
  const [isPending, startTransition] = useTransition()
  const [formData, setFormData] = useState({
    issueDate: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    tax: '0',
    notes: '',
    status: 'draft'
  })
  const [lineItems, setLineItems] = useState<LineItem[]>([])
  const [errors, setErrors] = useState<Record<string, string>>({})

  const routesQuery = useQuery({
    queryKey: ['routes'],
    queryFn: getRoutes,
    enabled: isOpen,
  })

  const studentsQuery = useQuery({
    queryKey: ['students'],
    queryFn: getStudents,
    enabled: isOpen,
  })

  const addLineItem = () => {
    const newItem: LineItem = {
      id: Math.random().toString(36).substr(2, 9),
      itemType: 'route',
      description: '',
      quantity: 1,
      unitPrice: 0,
      total: 0
    }
    setLineItems([...lineItems, newItem])
  }

  const updateLineItem = (id: string, updates: Partial<LineItem>) => {
    setLineItems(lineItems.map(item => {
      if (item.id === id) {
        const updated = { ...item, ...updates }
        updated.total = updated.quantity * updated.unitPrice
        return updated
      }
      return item
    }))
  }

  const removeLineItem = (id: string) => {
    setLineItems(lineItems.filter(item => item.id !== id))
  }

  const calculateTotals = () => {
    const subtotal = lineItems.reduce((sum, item) => sum + item.total, 0)
    const tax = parseFloat(formData.tax) || 0
    const total = subtotal + tax
    return { subtotal, tax, total }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const newErrors: Record<string, string> = {}
    if (!formData.issueDate) newErrors.issueDate = 'Issue date is required'
    if (!formData.dueDate) newErrors.dueDate = 'Due date is required'
    
    // Validate due date is ahead of issue date
    if (formData.issueDate && formData.dueDate) {
      const issueDate = new Date(formData.issueDate)
      const dueDate = new Date(formData.dueDate)
      if (dueDate <= issueDate) {
        newErrors.dueDate = 'Due date must be after issue date'
      }
    }
    
    if (lineItems.length === 0) newErrors.lineItems = 'At least one line item is required'

    lineItems.forEach((item, index) => {
      if (!item.description) newErrors[`lineItem_${index}_description`] = 'Description is required'
      if (item.quantity <= 0) newErrors[`lineItem_${index}_quantity`] = 'Quantity must be greater than 0'
      if (item.unitPrice <= 0) newErrors[`lineItem_${index}_unitPrice`] = 'Unit price must be greater than 0'
    })

    setErrors(newErrors)
    if (Object.keys(newErrors).length > 0) return

    const { subtotal, tax, total } = calculateTotals()

    startTransition(async () => {
      try {
        const response = await fetch('/api/invoices', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: formData.status,
            issueDate: formData.issueDate,
            dueDate: formData.dueDate,
            subtotal,
            tax,
            total,
            notes: formData.notes || undefined,
            lineItems: lineItems.map(item => ({
              itemType: item.itemType,
              routeId: item.routeId || undefined,
              studentId: item.studentId || undefined,
              description: item.description,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              total: item.total
            }))
          })
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Failed to create invoice')
        }

        toast.success('Invoice created successfully')
        setFormData({
          issueDate: new Date().toISOString().split('T')[0],
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          tax: '0',
          notes: '',
          status: 'draft'
        })
        setLineItems([])
        setErrors({})
        onClose()
        if (onSuccess) onSuccess()
      } catch (error: any) {
        toast.error('Failed to create invoice', {
          description: error.message || 'Please try again'
        })
      }
    })
  }

  const { subtotal, tax, total } = calculateTotals()

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent onClose={onClose} className="max-w-4xl max-h-[90vh] overflow-y-auto w-[95vw] sm:w-full mx-2 sm:mx-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Create Invoice</DialogTitle>
          <DialogDescription className="text-sm text-slate-600">
            Create a new invoice with line items for routes, students, or route-days.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            <div className="space-y-2">
              <Label htmlFor="status" className="text-sm font-medium text-slate-700">
                Status <span className="text-red-500">*</span>
              </Label>
              <Select
                id="status"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="h-10"
              >
                <option value="draft">Draft</option>
                <option value="sent">Sent</option>
                <option value="paid">Paid</option>
                <option value="overdue">Overdue</option>
                <option value="cancelled">Cancelled</option>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="issueDate" className="text-sm font-medium text-slate-700">
                Issue Date <span className="text-red-500">*</span>
              </Label>
              <Input
                id="issueDate"
                type="date"
                value={formData.issueDate}
                max={formData.dueDate ? new Date(new Date(formData.dueDate).getTime() - 86400000).toISOString().split('T')[0] : undefined}
                onChange={(e) => {
                  const newIssueDate = e.target.value
                  setFormData({ ...formData, issueDate: newIssueDate })
                  // Clear error if date is valid
                  if (formData.dueDate && newIssueDate) {
                    const issueDate = new Date(newIssueDate)
                    const dueDate = new Date(formData.dueDate)
                    if (dueDate > issueDate && errors.dueDate) {
                      setErrors({ ...errors, dueDate: '' })
                    }
                  }
                }}
                className={`h-10 ${errors.issueDate ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
              />
              {errors.issueDate && (
                <p className="text-xs text-red-500 mt-1">{errors.issueDate}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="dueDate" className="text-sm font-medium text-slate-700">
                Due Date <span className="text-red-500">*</span>
              </Label>
              <Input
                id="dueDate"
                type="date"
                value={formData.dueDate}
                min={formData.issueDate ? new Date(new Date(formData.issueDate).getTime() + 86400000).toISOString().split('T')[0] : undefined}
                onChange={(e) => {
                  const newDueDate = e.target.value
                  setFormData({ ...formData, dueDate: newDueDate })
                  // Clear error if date is valid
                  if (formData.issueDate && newDueDate) {
                    const issueDate = new Date(formData.issueDate)
                    const dueDate = new Date(newDueDate)
                    if (dueDate > issueDate && errors.dueDate) {
                      setErrors({ ...errors, dueDate: '' })
                    }
                  }
                }}
                className={`h-10 ${errors.dueDate ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
              />
              {errors.dueDate && (
                <p className="text-xs text-red-500 mt-1">{errors.dueDate}</p>
              )}
            </div>
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

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium text-slate-700">
                Line Items <span className="text-red-500">*</span>
              </Label>
              <Button 
                type="button" 
                onClick={addLineItem} 
                size="sm" 
                variant="outline"
                className="h-9 border-slate-300 hover:bg-slate-50"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Line Item
              </Button>
            </div>
            {errors.lineItems && (
              <p className="text-sm text-red-500">{errors.lineItems}</p>
            )}

            <div className="space-y-4">
              {lineItems.map((item, index) => (
                <div key={item.id} className="border border-slate-200 rounded-lg p-4 bg-slate-50 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-slate-900">Line Item {index + 1}</h4>
                    <Button
                      type="button"
                      onClick={() => removeLineItem(item.id)}
                      size="sm"
                      variant="outline"
                      className="h-8 px-2 border-red-300 text-red-600 hover:bg-red-50 hover:border-red-400"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-slate-700">
                        Type <span className="text-red-500">*</span>
                      </Label>
                      <Select
                        value={item.itemType}
                        onChange={(e) => updateLineItem(item.id, { itemType: e.target.value as any })}
                        className="h-10"
                      >
                        <option value="route">Route</option>
                        <option value="student">Student</option>
                        <option value="route-day">Route-Day</option>
                      </Select>
                    </div>

                    {item.itemType === 'route' && (
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-slate-700">Route</Label>
                        <Select
                          value={item.routeId || ''}
                          onChange={(e) => updateLineItem(item.id, { routeId: e.target.value })}
                          className="h-10"
                        >
                          <option value="">Select route...</option>
                          {routesQuery.data?.map((route: any) => (
                            <option key={route.id} value={route.id}>
                              {route.name}
                            </option>
                          ))}
                        </Select>
                      </div>
                    )}

                    {item.itemType === 'student' && (
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-slate-700">Student</Label>
                        <Select
                          value={item.studentId || ''}
                          onChange={(e) => updateLineItem(item.id, { studentId: e.target.value })}
                          className="h-10"
                        >
                          <option value="">Select student...</option>
                          {studentsQuery.data?.map((student: any) => (
                            <option key={student.id} value={student.id}>
                              {student.firstName} {student.lastName}
                            </option>
                          ))}
                        </Select>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-slate-700">
                      Description <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      value={item.description}
                      onChange={(e) => updateLineItem(item.id, { description: e.target.value })}
                      placeholder="Item description..."
                      className={`h-10 ${errors[`lineItem_${index}_description`] ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                    />
                    {errors[`lineItem_${index}_description`] && (
                      <p className="text-xs text-red-500 mt-1">{errors[`lineItem_${index}_description`]}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-slate-700">
                        Quantity <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={item.quantity}
                        onChange={(e) => updateLineItem(item.id, { quantity: parseFloat(e.target.value) || 0 })}
                        className={`h-10 ${errors[`lineItem_${index}_quantity`] ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                      />
                      {errors[`lineItem_${index}_quantity`] && (
                        <p className="text-xs text-red-500 mt-1">{errors[`lineItem_${index}_quantity`]}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-slate-700">
                        Unit Price <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={item.unitPrice}
                        onChange={(e) => updateLineItem(item.id, { unitPrice: parseFloat(e.target.value) || 0 })}
                        className={`h-10 ${errors[`lineItem_${index}_unitPrice`] ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                      />
                      {errors[`lineItem_${index}_unitPrice`] && (
                        <p className="text-xs text-red-500 mt-1">{errors[`lineItem_${index}_unitPrice`]}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-slate-700">Total</Label>
                      <Input
                        type="number"
                        value={item.total.toFixed(2)}
                        disabled
                        className="h-10 bg-slate-100 text-slate-600 cursor-not-allowed"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-slate-200 pt-4 space-y-3 bg-slate-50 rounded-lg p-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-slate-700">Subtotal:</span>
              <span className="text-sm font-semibold text-slate-900">${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center">
              <Label htmlFor="tax" className="text-sm font-medium text-slate-700">Tax:</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="tax"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.tax}
                  onChange={(e) => setFormData({ ...formData, tax: e.target.value })}
                  className="w-24 h-9"
                />
                <span className="text-sm font-semibold text-slate-900">${tax.toFixed(2)}</span>
              </div>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-slate-200">
              <span className="text-base font-semibold text-slate-900">Total:</span>
              <span className="text-lg font-bold text-slate-900">${total.toFixed(2)}</span>
            </div>
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
              {isPending ? 'Creating...' : 'Create Invoice'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
