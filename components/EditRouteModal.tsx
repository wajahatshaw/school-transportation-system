'use client'

import { useState, useTransition } from 'react'
import { Loader2, MapPin, Plus, Trash2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Input, Label } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

// Type definitions to avoid Prisma client import issues
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

type Driver = {
  id: string
  tenantId: string
  firstName: string
  lastName: string
  licenseNumber: string | null
  deletedAt: Date | null
  deletedBy: string | null
  createdAt: Date
  updatedAt: Date
}

type Route = {
  id: string
  tenantId: string
  name: string
  type: string
  vehicleId: string | null
  driverId: string | null
  stops: any
  deletedAt: Date | null
  deletedBy: string | null
  createdAt: Date
  updatedAt: Date
}

interface Stop {
  address: string
  order: number
}

interface EditRouteModalProps {
  route: Route
  vehicles: Vehicle[]
  drivers: Driver[]
  onClose: () => void
  onSave: (data: { 
    name: string
    type: 'AM' | 'PM'
    vehicleId?: string | null
    driverId?: string | null
    stops?: any
  }) => Promise<void>
}

export function EditRouteModal({ route, vehicles, drivers, onClose, onSave }: EditRouteModalProps) {
  const [isPending, startTransition] = useTransition()
  
  // Parse existing stops or initialize empty array
  const parseStops = (stopsData: any): Stop[] => {
    try {
      if (Array.isArray(stopsData)) {
        return stopsData.map((stop, index) => ({
          address: stop.address || '',
          order: stop.order || index + 1
        }))
      }
      return []
    } catch {
      return []
    }
  }

  const [formData, setFormData] = useState({
    name: route.name,
    type: route.type as 'AM' | 'PM',
    vehicleId: route.vehicleId || '',
    driverId: route.driverId || '',
  })
  const [stops, setStops] = useState<Stop[]>(parseStops(route.stops))
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    
    if (!formData.name.trim()) {
      newErrors.name = 'Route name is required'
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
        type: formData.type,
        vehicleId: formData.vehicleId || null,
        driverId: formData.driverId || null,
        stops: stops.filter(stop => stop.address.trim() !== ''),
      })
    })
  }

  const handleChange = (field: string, value: string) => {
    setFormData({ ...formData, [field]: value })
    if (errors[field]) {
      setErrors({ ...errors, [field]: '' })
    }
  }

  const addStop = () => {
    setStops([...stops, { address: '', order: stops.length + 1 }])
  }

  const removeStop = (index: number) => {
    const newStops = stops.filter((_, i) => i !== index)
    // Reorder remaining stops
    const reorderedStops = newStops.map((stop, i) => ({ ...stop, order: i + 1 }))
    setStops(reorderedStops)
  }

  const updateStop = (index: number, address: string) => {
    const newStops = [...stops]
    newStops[index] = { ...newStops[index], address }
    setStops(newStops)
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent 
        onClose={onClose}
        className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto"
      >
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-100">
              <MapPin className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <DialogTitle className="text-xl">Edit Route</DialogTitle>
              <DialogDescription className="text-sm text-slate-500 mt-1">
                Update route information below
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            {/* Route Name */}
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-medium text-slate-700">
                Route Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="e.g., Downtown Loop, North Side Route"
                disabled={isPending}
                className={errors.name ? 'border-red-500 focus-visible:ring-red-500' : ''}
                autoFocus
              />
              {errors.name && (
                <p className="text-sm text-red-600">{errors.name}</p>
              )}
            </div>

            {/* Route Type */}
            <div className="space-y-2">
              <Label htmlFor="type" className="text-sm font-medium text-slate-700">
                Route Type <span className="text-red-500">*</span>
              </Label>
              <select
                id="type"
                value={formData.type}
                onChange={(e) => handleChange('type', e.target.value)}
                disabled={isPending}
                className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="AM">AM (Morning)</option>
                <option value="PM">PM (Afternoon)</option>
              </select>
              <p className="text-xs text-slate-500">Select whether this is a morning or afternoon route</p>
            </div>

            {/* Vehicle Assignment */}
            <div className="space-y-2">
              <Label htmlFor="vehicleId" className="text-sm font-medium text-slate-700">
                Assign Vehicle
              </Label>
              <select
                id="vehicleId"
                value={formData.vehicleId}
                onChange={(e) => handleChange('vehicleId', e.target.value)}
                disabled={isPending}
                className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">Unassigned</option>
                {vehicles.map((vehicle) => (
                  <option key={vehicle.id} value={vehicle.id}>
                    {vehicle.name} ({vehicle.capacity} seats)
                  </option>
                ))}
              </select>
              <p className="text-xs text-slate-500">Optional: Assign a vehicle to this route</p>
            </div>

            {/* Driver Assignment */}
            <div className="space-y-2">
              <Label htmlFor="driverId" className="text-sm font-medium text-slate-700">
                Assign Driver
              </Label>
              <select
                id="driverId"
                value={formData.driverId}
                onChange={(e) => handleChange('driverId', e.target.value)}
                disabled={isPending}
                className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">Unassigned</option>
                {drivers.map((driver) => (
                  <option key={driver.id} value={driver.id}>
                    {driver.firstName} {driver.lastName}
                  </option>
                ))}
              </select>
              <p className="text-xs text-slate-500">Optional: Assign a driver to this route</p>
            </div>

            {/* Stops - User Friendly Interface */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium text-slate-700">
                  Route Stops
                </Label>
                <Button
                  type="button"
                  onClick={addStop}
                  disabled={isPending}
                  size="sm"
                  variant="outline"
                  className="text-xs"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add Stop
                </Button>
              </div>
              
              {stops.length === 0 ? (
                <div className="text-center py-8 border-2 border-dashed border-slate-200 rounded-lg">
                  <MapPin className="h-8 w-8 mx-auto text-slate-400 mb-2" />
                  <p className="text-sm text-slate-500">No stops added yet</p>
                  <p className="text-xs text-slate-400 mt-1">Click "Add Stop" to add a stop</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto border border-slate-200 rounded-lg p-3">
                  {stops.map((stop, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 text-slate-600 font-semibold text-sm flex-shrink-0">
                        {index + 1}
                      </div>
                      <Input
                        value={stop.address}
                        onChange={(e) => updateStop(index, e.target.value)}
                        placeholder="Enter address (e.g., 123 Main Street)"
                        disabled={isPending}
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        onClick={() => removeStop(index)}
                        disabled={isPending}
                        size="sm"
                        variant="ghost"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 flex-shrink-0"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              <p className="text-xs text-slate-500">
                Optional: Add stops in the order they should be visited. Drag or use the numbers to reorder.
              </p>
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
