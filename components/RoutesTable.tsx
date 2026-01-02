'use client'

import { useState, useTransition, useEffect } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import { updateRoute, deleteRoute, getRouteCapacity } from '@/lib/actions'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { EditRouteModal } from './EditRouteModal'
import { DeleteConfirmDialog } from './DeleteConfirmDialog'
import { RouteCapacityIndicator } from './RouteCapacityIndicator'

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
  createdAt: Date | null
  updatedAt: Date | null
}

type Driver = {
  id: string
  tenantId: string
  firstName: string
  lastName: string
  licenseNumber: string | null
  deletedAt: Date | null
  deletedBy: string | null
  createdAt: Date | null
  updatedAt: Date | null
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
  createdAt: Date | null
  updatedAt: Date | null
}

interface RouteWithRelations extends Route {
  vehicle?: Vehicle | null
  driver?: Driver | null
}

interface RoutesTableProps {
  routes: RouteWithRelations[]
  vehicles: Vehicle[]
  drivers: Driver[]
  onUpdate?: () => void
}

export function RoutesTable({ routes, vehicles, drivers, onUpdate }: RoutesTableProps) {
  const [editingRoute, setEditingRoute] = useState<RouteWithRelations | null>(null)
  const [deletingRoute, setDeletingRoute] = useState<RouteWithRelations | null>(null)
  const [isPending, startTransition] = useTransition()
  const [capacities, setCapacities] = useState<Map<string, { assigned: number; capacity: number; available: number; isFull: boolean }>>(new Map())

  // Load capacities for all routes
  useEffect(() => {
    const loadCapacities = async () => {
      const newCapacities = new Map()
      for (const route of routes) {
        try {
          const capacity = await getRouteCapacity(route.id)
          newCapacities.set(route.id, capacity)
        } catch (error) {
          // Skip if error
        }
      }
      setCapacities(newCapacities)
    }
    loadCapacities()
  }, [routes])

  const handleEdit = (route: RouteWithRelations) => {
    setEditingRoute(route)
  }

  const handleUpdate = async (data: { 
    name: string
    type: 'AM' | 'PM'
    vehicleId?: string | null
    driverId?: string | null
    stops?: any
  }) => {
    if (!editingRoute) return

    setEditingRoute(null)

    startTransition(async () => {
      try {
        await updateRoute(editingRoute.id, data)
        toast.success('Route updated successfully', {
          description: `${data.name} has been updated.`
        })
        
        // Refresh the data
        if (onUpdate) {
          onUpdate()
        }
      } catch (error) {
        toast.error('Failed to update route', {
          description: 'Please try again or contact support if the problem persists.'
        })
      }
    })
  }

  const handleDelete = async () => {
    if (!deletingRoute) return

    const deletedRoute = deletingRoute
    setDeletingRoute(null)

    startTransition(async () => {
      try {
        await deleteRoute(deletedRoute.id)
        toast.success('Route deleted successfully', {
          description: `${deletedRoute.name} has been removed.`
        })
        
        // Refresh the data
        if (onUpdate) {
          onUpdate()
        }
      } catch (error) {
        toast.error('Failed to delete route', {
          description: 'Please try again or contact support if the problem persists.'
        })
      }
    })
  }

  if (routes.length === 0) {
    return (
      <EmptyState
        icon={<div className="text-6xl">🗺️</div>}
        title="No routes yet"
        description="Get started by adding your first route to the system."
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
                  Route Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Vehicle
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Driver
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Capacity
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
              {routes.map((route) => {
                const capacity = capacities.get(route.id)
                return (
                  <tr
                    key={route.id}
                    className="transition-all duration-200 hover:bg-slate-50"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 flex-shrink-0">
                          <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-semibold text-sm">
                            🗺️
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-slate-900">
                            {route.name}
                          </div>
                          <div className="text-xs text-slate-500">
                            {Array.isArray(route.stops) ? route.stops.length : 0} stops
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge variant={route.type === 'AM' ? 'default' : 'warning'}>
                        {route.type}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-slate-900">
                        {route.vehicle?.name || 'Unassigned'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-slate-900">
                        {route.driver 
                          ? `${route.driver.firstName} ${route.driver.lastName}`
                          : 'Unassigned'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {capacity && (
                        <RouteCapacityIndicator
                          assigned={capacity.assigned}
                          capacity={capacity.capacity}
                          available={capacity.available}
                          isFull={capacity.isFull}
                        />
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge variant={route.deletedAt ? 'danger' : 'success'}>
                        {route.deletedAt ? 'Deleted' : 'Active'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          onClick={() => handleEdit(route)}
                          variant="ghost"
                          size="sm"
                          className="text-slate-700"
                          disabled={isPending}
                        >
                          <Pencil className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                        <Button
                          onClick={() => setDeletingRoute(route)}
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
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {editingRoute && (
        <EditRouteModal
          route={editingRoute}
          vehicles={vehicles}
          drivers={drivers}
          onClose={() => setEditingRoute(null)}
          onSave={handleUpdate}
        />
      )}

      {deletingRoute && (
        <DeleteConfirmDialog
          title="Delete Route"
          description={`Are you sure you want to delete ${deletingRoute.name}? This action can be reversed later.`}
          onConfirm={handleDelete}
          onCancel={() => setDeletingRoute(null)}
        />
      )}
    </>
  )
}

