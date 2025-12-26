'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Loader2, Bus } from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Input, Label } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

interface AddVehicleButtonProps {
  onSuccess?: () => void
}

export function AddVehicleButton({ onSuccess }: AddVehicleButtonProps) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [formData, setFormData] = useState({
    name: '',
    capacity: '',
    licensePlate: '',
    vehicleType: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    
    if (!formData.name.trim()) {
      newErrors.name = 'Vehicle name is required'
    }
    if (!formData.capacity.trim()) {
      newErrors.capacity = 'Capacity is required'
    } else {
      const capacityNum = parseInt(formData.capacity)
      if (isNaN(capacityNum) || capacityNum <= 0) {
        newErrors.capacity = 'Capacity must be a positive number'
      }
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    startTransition(async () => {
      try {
        const response = await fetch('/api/vehicles', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: formData.name.trim(),
            capacity: parseInt(formData.capacity),
            licensePlate: formData.licensePlate.trim() || undefined,
            vehicleType: formData.vehicleType.trim() || undefined,
          }),
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Failed to create vehicle')
        }

        toast.success('Vehicle added successfully', {
          description: `${formData.name} has been added to the system.`
        })
        setIsOpen(false)
        setFormData({ name: '', capacity: '', licensePlate: '', vehicleType: '' })
        setErrors({})
        
        // Refresh the page data immediately
        router.refresh()
        if (onSuccess) {
          onSuccess()
        }
      } catch (error) {
        toast.error('Failed to add vehicle', {
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
      setFormData({ name: '', capacity: '', licensePlate: '', vehicleType: '' })
      setErrors({})
    }
  }

  return (
    <>
      <Button onClick={() => setIsOpen(true)} size="default" className="gap-2">
        <Plus className="h-4 w-4" />
        Add Vehicle
      </Button>

      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent 
          onClose={handleClose}
          className="sm:max-w-[500px]"
        >
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
                <Bus className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <DialogTitle className="text-xl">Add New Vehicle</DialogTitle>
                <DialogDescription className="text-sm text-slate-500 mt-1">
                  Enter vehicle information to add it to the system
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              {/* Vehicle Name */}
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium text-slate-700">
                  Vehicle Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  placeholder="e.g., Bus 101, Van A"
                  disabled={isPending}
                  className={errors.name ? 'border-red-500 focus-visible:ring-red-500' : ''}
                  autoFocus
                />
                {errors.name && (
                  <p className="text-sm text-red-600">{errors.name}</p>
                )}
              </div>

              {/* Capacity */}
              <div className="space-y-2">
                <Label htmlFor="capacity" className="text-sm font-medium text-slate-700">
                  Capacity <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="capacity"
                  type="number"
                  min="1"
                  value={formData.capacity}
                  onChange={(e) => handleChange('capacity', e.target.value)}
                  placeholder="e.g., 20"
                  disabled={isPending}
                  className={errors.capacity ? 'border-red-500 focus-visible:ring-red-500' : ''}
                />
                {errors.capacity && (
                  <p className="text-sm text-red-600">{errors.capacity}</p>
                )}
                <p className="text-xs text-slate-500">Number of students the vehicle can accommodate</p>
              </div>

              {/* Vehicle Type */}
              <div className="space-y-2">
                <Label htmlFor="vehicleType" className="text-sm font-medium text-slate-700">
                  Vehicle Type
                </Label>
                <Input
                  id="vehicleType"
                  value={formData.vehicleType}
                  onChange={(e) => handleChange('vehicleType', e.target.value)}
                  placeholder="e.g., School Bus, Van, Mini Bus"
                  disabled={isPending}
                />
                <p className="text-xs text-slate-500">Optional: Type or category of vehicle</p>
              </div>

              {/* License Plate */}
              <div className="space-y-2">
                <Label htmlFor="licensePlate" className="text-sm font-medium text-slate-700">
                  License Plate
                </Label>
                <Input
                  id="licensePlate"
                  value={formData.licensePlate}
                  onChange={(e) => handleChange('licensePlate', e.target.value)}
                  placeholder="e.g., ABC-1234"
                  disabled={isPending}
                  className="font-mono"
                />
                <p className="text-xs text-slate-500">Optional: Vehicle registration plate number</p>
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
                    Adding...
                  </>
                ) : (
                  'Add Vehicle'
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}

