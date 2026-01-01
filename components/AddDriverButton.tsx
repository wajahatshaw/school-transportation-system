'use client'

import { useState, useTransition } from 'react'
import { Plus, Loader2, Car, CreditCard, Mail, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Input, Label } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

interface AddDriverButtonProps {
  onSuccess?: () => void
}

export function AddDriverButton({ onSuccess }: AddDriverButtonProps) {
  const queryClient = useQueryClient()
  const [isOpen, setIsOpen] = useState(false)
  const [isSuccessOpen, setIsSuccessOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    licenseNumber: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [successInfo, setSuccessInfo] = useState<{ name: string; email: string } | null>(null)

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    
    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required'
    }
    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required'
    }
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim().toLowerCase())) {
      newErrors.email = 'Please enter a valid email address'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    startTransition(async () => {
      try {
        const response = await fetch('/api/drivers', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            firstName: formData.firstName.trim(),
            lastName: formData.lastName.trim(),
            email: formData.email.trim().toLowerCase(),
            licenseNumber: formData.licenseNumber.trim() || undefined,
          }),
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Failed to create driver')
        }

        const name = `${formData.firstName.trim()} ${formData.lastName.trim()}`.trim()
        const email = formData.email.trim().toLowerCase()
        setSuccessInfo({ name, email })
        setIsSuccessOpen(true)

        toast.success('Driver invited successfully', {
          description: `A set-password link was sent to ${email}.`,
        })
        setIsOpen(false)
        setFormData({ firstName: '', lastName: '', email: '', licenseNumber: '' })
        setErrors({})
        
        // Refresh the page data
        if (onSuccess) {
          onSuccess()
        } else {
          queryClient.invalidateQueries({ queryKey: ['drivers'] })
          // driver list can be used in routes & trip assignment dropdowns
          queryClient.invalidateQueries({ queryKey: ['routes'] })
        }
      } catch (error) {
        toast.error('Failed to add driver', {
          description: error instanceof Error ? error.message : 'Please try again or contact support if the problem persists.'
        })
      }
    })
  }

  const handleChange = (field: string, value: string) => {
    setFormData({ ...formData, [field]: value })
    if (errors[field]) {
      setErrors({ ...errors, [field]: '' })
    }
  }

  const handleClose = () => {
    if (!isPending) {
      setIsOpen(false)
      setFormData({ firstName: '', lastName: '', email: '', licenseNumber: '' })
      setErrors({})
    }
  }

  return (
    <>
      <Button onClick={() => setIsOpen(true)} size="default" className="gap-2">
        <Plus className="h-4 w-4" />
        Add Driver
      </Button>

      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent 
          onClose={handleClose}
          className="sm:max-w-[500px]"
        >
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                <Car className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <DialogTitle className="text-xl">Add New Driver</DialogTitle>
                <DialogDescription className="text-sm text-slate-500 mt-1">
                  Enter driver information and invite them to log in
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

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-slate-700">
                  Email <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    id="email"
                    value={formData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    placeholder="driver@email.com"
                    disabled={isPending}
                    className={[
                      'pl-10',
                      errors.email ? 'border-red-500 focus-visible:ring-red-500' : '',
                    ].join(' ')}
                    inputMode="email"
                    autoComplete="email"
                  />
                </div>
                {errors.email ? (
                  <p className="text-sm text-red-600">{errors.email}</p>
                ) : (
                  <p className="text-xs text-slate-500">We’ll send a secure set-password link to this email.</p>
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
                onClick={handleClose}
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
                    Inviting...
                  </>
                ) : (
                  'Invite Driver'
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Success popup */}
      <Dialog
        open={isSuccessOpen}
        onOpenChange={(open) => {
          setIsSuccessOpen(open)
          if (!open) setSuccessInfo(null)
        }}
      >
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
                <CheckCircle2 className="h-6 w-6 text-emerald-700" />
              </div>
              <div>
                <DialogTitle className="text-xl">Driver invited</DialogTitle>
                <DialogDescription className="text-sm text-slate-500 mt-1">
                  Supabase sent a set-password link to the driver’s email address.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="rounded-lg border bg-slate-50 p-4">
            <p className="text-sm text-slate-700">
              <span className="font-medium">Driver:</span>{' '}
              {successInfo?.name || '—'}
            </p>
            <p className="text-sm text-slate-700 mt-1">
              <span className="font-medium">Email:</span>{' '}
              {successInfo?.email || '—'}
            </p>
            <p className="text-xs text-slate-500 mt-3">
              They can open the link, set a password, and then log in to your website.
            </p>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              type="button"
              onClick={() => {
                setIsSuccessOpen(false)
                setSuccessInfo(null)
              }}
            >
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
