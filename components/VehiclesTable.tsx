'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil, Trash2, Wrench } from 'lucide-react'
import { updateVehicle, deleteVehicle } from '@/lib/actions'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { EditVehicleModal } from './EditVehicleModal'
import { DeleteConfirmDialog } from './DeleteConfirmDialog'

// Type definition to avoid Prisma client import issues
type Vehicle = {
  id: string
  tenantId: string
  name: string
  capacity: number
  licensePlate: string | null
  vehicleType: string | null
  manufactureYear: number | null
  model: string | null
  deletedAt: Date | null
  deletedBy: string | null
  createdAt: Date | null
  updatedAt: Date | null
}

interface VehiclesTableProps {
  vehicles: Vehicle[]
  onUpdate?: () => void
}

export function VehiclesTable({ vehicles, onUpdate }: VehiclesTableProps) {
  const router = useRouter()
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null)
  const [deletingVehicle, setDeletingVehicle] = useState<Vehicle | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleEdit = (vehicle: Vehicle) => {
    setEditingVehicle(vehicle)
  }

  const handleUpdate = async (data: { 
    name: string
    capacity: number
    licensePlate?: string
    vehicleType?: string
    manufactureYear?: number
    model?: string
  }) => {
    if (!editingVehicle) return

    setEditingVehicle(null)

    startTransition(async () => {
      try {
        await updateVehicle(editingVehicle.id, data)
        toast.success('Vehicle updated successfully', {
          description: `${data.name} has been updated.`
        })
        
        // Refresh the data
        if (onUpdate) {
          onUpdate()
        }
      } catch (error) {
        toast.error('Failed to update vehicle', {
          description: 'Please try again or contact support if the problem persists.'
        })
      }
    })
  }

  const handleDelete = async () => {
    if (!deletingVehicle) return

    const deletedVehicle = deletingVehicle
    setDeletingVehicle(null)

    startTransition(async () => {
      try {
        await deleteVehicle(deletedVehicle.id)
        toast.success('Vehicle deleted successfully', {
          description: `${deletedVehicle.name} has been removed.`
        })
        
        // Refresh the data
        if (onUpdate) {
          onUpdate()
        }
      } catch (error) {
        toast.error('Failed to delete vehicle', {
          description: 'Please try again or contact support if the problem persists.'
        })
      }
    })
  }

  const handleViewMaintenance = (vehicleId: string) => {
    router.push(`/dashboard/vehicles/${vehicleId}/maintenance`)
  }

  if (vehicles.length === 0) {
    return (
      <EmptyState
        icon={<div className="text-6xl">🚌</div>}
        title="No vehicles yet"
        description="Get started by adding your first vehicle to the system."
      />
    )
  }

  return (
    <>
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Capacity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  License Plate
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Year / Model
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {vehicles.map((vehicle) => (
                <tr
                  key={vehicle.id}
                  className="transition-all duration-200 hover:bg-slate-50"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-10 w-10 flex-shrink-0">
                        <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold text-sm">
                          🚌
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-slate-900">
                          {vehicle.name}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-slate-900">
                      {vehicle.vehicleType || 'N/A'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge variant="default">
                      {vehicle.capacity} seats
                    </Badge>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-slate-900 font-mono">
                      {vehicle.licensePlate || 'N/A'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-slate-900">
                      {vehicle.manufactureYear || vehicle.model ? (
                        <>
                          {vehicle.manufactureYear && <span>{vehicle.manufactureYear}</span>}
                          {vehicle.manufactureYear && vehicle.model && <span className="mx-1">/</span>}
                          {vehicle.model && <span>{vehicle.model}</span>}
                        </>
                      ) : (
                        'N/A'
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge variant={vehicle.deletedAt ? 'danger' : 'success'}>
                      {vehicle.deletedAt ? 'Deleted' : 'Active'}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        onClick={() => handleViewMaintenance(vehicle.id)}
                        variant="ghost"
                        size="sm"
                        className="text-slate-700"
                        disabled={isPending}
                      >
                        <Wrench className="h-4 w-4 mr-1" />
                        Maintenance
                      </Button>
                      <Button
                        onClick={() => handleEdit(vehicle)}
                        variant="ghost"
                        size="sm"
                        className="text-slate-700"
                        disabled={isPending}
                      >
                        <Pencil className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                      <Button
                        onClick={() => setDeletingVehicle(vehicle)}
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        disabled={isPending}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {editingVehicle && (
        <EditVehicleModal
          vehicle={editingVehicle}
          onClose={() => setEditingVehicle(null)}
          onSave={handleUpdate}
        />
      )}

      {deletingVehicle && (
        <DeleteConfirmDialog
          title="Delete Vehicle"
          description={`Are you sure you want to delete ${deletingVehicle.name}? This action can be reversed later.`}
          onConfirm={handleDelete}
          onCancel={() => setDeletingVehicle(null)}
        />
      )}
    </>
  )
}

