'use client'

import { useState, useTransition } from 'react'
import { Driver } from '@prisma/client'
import { Pencil, Trash2, FileCheck } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { updateDriver, deleteDriver } from '@/lib/actions'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { EditDriverModal } from './EditDriverModal'
import { DeleteConfirmDialog } from './DeleteConfirmDialog'

interface DriversTableProps {
  drivers: Driver[]
  onUpdate?: () => void
}

export function DriversTable({ drivers, onUpdate }: DriversTableProps) {
  const router = useRouter()
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null)
  const [deletingDriver, setDeletingDriver] = useState<Driver | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleEdit = (driver: Driver) => {
    setEditingDriver(driver)
  }

  const handleUpdate = async (data: { firstName: string; lastName: string; licenseNumber?: string }) => {
    if (!editingDriver) return

    setEditingDriver(null)

    startTransition(async () => {
      try {
        await updateDriver(editingDriver.id, data)
        toast.success('Driver updated successfully', {
          description: `${data.firstName} ${data.lastName}'s information has been updated.`
        })
        
        // Refresh the data
        if (onUpdate) {
          onUpdate()
        }
      } catch (error) {
        toast.error('Failed to update driver', {
          description: 'Please try again or contact support if the problem persists.'
        })
      }
    })
  }

  const handleDelete = async () => {
    if (!deletingDriver) return

    const deletedDriver = deletingDriver
    setDeletingDriver(null)

    startTransition(async () => {
      try {
        await deleteDriver(deletedDriver.id)
        toast.success('Driver deleted successfully', {
          description: `${deletedDriver.firstName} ${deletedDriver.lastName} has been removed.`
        })
        
        // Refresh the data
        if (onUpdate) {
          onUpdate()
        }
      } catch (error) {
        toast.error('Failed to delete driver', {
          description: 'Please try again or contact support if the problem persists.'
        })
      }
    })
  }

  const handleViewCompliance = (driverId: string) => {
    router.push(`/dashboard/drivers/${driverId}/compliance`)
  }

  if (drivers.length === 0) {
    return (
      <EmptyState
        icon={<div className="text-6xl">🚗</div>}
        title="No drivers yet"
        description="Get started by adding your first driver to the system."
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
                  License Number
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
              {drivers.map((driver) => (
                <tr
                  key={driver.id}
                  className="transition-all duration-200 hover:bg-slate-50"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-10 w-10 flex-shrink-0">
                        <div className="h-10 w-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-semibold">
                          {driver.firstName[0]}
                          {driver.lastName[0]}
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-slate-900">
                          {driver.firstName} {driver.lastName}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-slate-900">{driver.licenseNumber || 'N/A'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge variant={driver.isDeleted ? 'danger' : 'success'}>
                      {driver.isDeleted ? 'Deleted' : 'Active'}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        onClick={() => handleViewCompliance(driver.id)}
                        variant="ghost"
                        size="sm"
                        className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        disabled={isPending}
                      >
                        <FileCheck className="h-4 w-4 mr-1" />
                        Compliance
                      </Button>
                      <Button
                        onClick={() => handleEdit(driver)}
                        variant="ghost"
                        size="sm"
                        className="text-slate-700"
                        disabled={isPending}
                      >
                        <Pencil className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                      <Button
                        onClick={() => setDeletingDriver(driver)}
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

      {editingDriver && (
        <EditDriverModal
          driver={editingDriver}
          onClose={() => setEditingDriver(null)}
          onSave={handleUpdate}
        />
      )}

      {deletingDriver && (
        <DeleteConfirmDialog
          title="Delete Driver"
          description={`Are you sure you want to delete ${deletingDriver.firstName} ${deletingDriver.lastName}? This action can be reversed later.`}
          onConfirm={handleDelete}
          onCancel={() => setDeletingDriver(null)}
        />
      )}
    </>
  )
}
