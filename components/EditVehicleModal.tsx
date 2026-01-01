'use client'

import { useState, useTransition } from 'react'
import { Loader2, Bus } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Input, Label } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

// Type definition to avoid Prisma client import issues
type Vehicle = {
  id: string
  tenantId: string
  name: string
  capacity: number
  licensePlate: string | null
  vehicleType: string | null
  deletedAt: Date | null
  deletedBy: string | null
  createdAt: Date
  updatedAt: Date
}

interface EditVehicleModalProps {
  vehicle: Vehicle
  onClose: () => void
  onSave: (data: { 
    name: string
    capacity: number
    licensePlate?: string
    vehicleType?: string
  }) => Promise<void>
}

export function EditVehicleModal({ vehicle, onClose, onSave }: EditVehicleModalProps) {
  const MAX_VEHICLE_CAPACITY = 60
  const [isPending, startTransition] = useTransition()
  const [formData, setFormData] = useState({
    name: vehicle.name,
    capacity: vehicle.capacity.toString(),
    licensePlate: vehicle.licensePlate || '',
    vehicleType: vehicle.vehicleType || '',
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
      } else if (capacityNum > MAX_VEHICLE_CAPACITY) {
        newErrors.capacity = `Maximum capacity is ${MAX_VEHICLE_CAPACITY} seats`
      }
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return

    startTransition(async () => {
      await onSave({
        name: formData.name.trim(),
        capacity: parseInt(formData.capacity),
        licensePlate: formData.licensePlate.trim() || undefined,
        vehicleType: formData.vehicleType.trim() || undefined,
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
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
              <Bus className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <DialogTitle className="text-xl">Edit Vehicle</DialogTitle>
              <DialogDescription className="text-sm text-slate-500 mt-1">
                Update vehicle information below
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} noValidate className="space-y-6">
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
                max={MAX_VEHICLE_CAPACITY}
                step="1"
                value={formData.capacity}
                onChange={(e) => handleChange('capacity', e.target.value)}
                placeholder="e.g., 20"
                disabled={isPending}
                className={errors.capacity ? 'border-red-500 focus-visible:ring-red-500' : ''}
              />
              {errors.capacity && (
                <p className="text-sm text-red-600">{errors.capacity}</p>
              )}
              <p className="text-xs text-slate-500">Number of students the vehicle can accommodate (1–{MAX_VEHICLE_CAPACITY})</p>
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

