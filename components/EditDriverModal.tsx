'use client'

import { useState, useTransition } from 'react'
import { Loader2, Car, CreditCard } from 'lucide-react'
import { Driver } from '@prisma/client'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Input, Label } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

interface EditDriverModalProps {
  driver: Driver
  onClose: () => void
  onSave: (data: { firstName: string; lastName: string; licenseNumber?: string }) => Promise<void>
}

export function EditDriverModal({ driver, onClose, onSave }: EditDriverModalProps) {
  const [isPending, startTransition] = useTransition()
  const [formData, setFormData] = useState({
    firstName: driver.firstName,
    lastName: driver.lastName,
    licenseNumber: driver.licenseNumber || '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    
    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required'
    }
    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return

    startTransition(async () => {
      await onSave({
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        licenseNumber: formData.licenseNumber.trim() || undefined,
      })
    })
  }

  const handleChange = (field: string, value: string) => {
    setFormData({ ...formData, [field]: value })
    if (errors[field]) {
      setErrors({ ...errors, [field]: '' })
    }
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent 
        onClose={onClose}
        className="sm:max-w-[500px]"
      >
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
              <Car className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <DialogTitle className="text-xl">Edit Driver</DialogTitle>
              <DialogDescription className="text-sm text-slate-500 mt-1">
                Update driver information below
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            {/* First Name */}
            <div className="space-y-2">
              <Label htmlFor="firstName" className="text-sm font-medium text-slate-700">
                First Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="firstName"
                value={formData.firstName}
                onChange={(e) => handleChange('firstName', e.target.value)}
                placeholder="Enter first name"
                disabled={isPending}
                className={errors.firstName ? 'border-red-500 focus-visible:ring-red-500' : ''}
                autoFocus
              />
              {errors.firstName && (
                <p className="text-sm text-red-600">{errors.firstName}</p>
              )}
            </div>

            {/* Last Name */}
            <div className="space-y-2">
              <Label htmlFor="lastName" className="text-sm font-medium text-slate-700">
                Last Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="lastName"
                value={formData.lastName}
                onChange={(e) => handleChange('lastName', e.target.value)}
                placeholder="Enter last name"
                disabled={isPending}
                className={errors.lastName ? 'border-red-500 focus-visible:ring-red-500' : ''}
              />
              {errors.lastName && (
                <p className="text-sm text-red-600">{errors.lastName}</p>
              )}
            </div>

            {/* License Number */}
            <div className="space-y-2">
              <Label htmlFor="licenseNumber" className="text-sm font-medium text-slate-700">
                License Number
              </Label>
              <div className="relative">
                <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  id="licenseNumber"
                  value={formData.licenseNumber}
                  onChange={(e) => handleChange('licenseNumber', e.target.value)}
                  placeholder="e.g., DL-123456"
                  disabled={isPending}
                  className="pl-10"
                />
              </div>
              <p className="text-xs text-slate-500">Optional: Driver's license identification number</p>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              className="min-w-[120px]"
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
