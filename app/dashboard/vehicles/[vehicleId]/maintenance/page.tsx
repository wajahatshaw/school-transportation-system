import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { getVehicleById, getVehicleMaintenanceDocuments } from '@/lib/actions'
import { VehicleMaintenanceDocumentsTable } from '@/components/VehicleMaintenanceDocumentsTable'
import { AddVehicleMaintenanceDocumentButton } from '@/components/AddVehicleMaintenanceDocumentButton'
import { Button } from '@/components/ui/button'
import { TableSkeleton } from '@/components/ui/skeleton'

export default async function VehicleMaintenancePage({
  params,
}: {
  params: Promise<{ vehicleId: string }>
}) {
  try {
    // Safely await params with error handling for Netlify compatibility
    const resolvedParams = await params
    
    if (!resolvedParams || !resolvedParams.vehicleId) {
      notFound()
    }

    const { vehicleId } = resolvedParams
    
    if (!vehicleId || typeof vehicleId !== 'string') {
      notFound()
    }

    const vehicle = await getVehicleById(vehicleId)

    if (!vehicle) {
      notFound()
    }

    return (
      <div className="space-y-6">
        <div>
          <Link href="/dashboard/vehicles">
            <Button variant="ghost" size="sm" className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Vehicles
            </Button>
          </Link>

          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                {vehicle.name}
              </h1>
              <p className="text-slate-600 mt-1">
                {vehicle.licensePlate && `License: ${vehicle.licensePlate}`}
                {vehicle.manufactureYear && vehicle.model && ` • ${vehicle.manufactureYear} ${vehicle.model}`}
                {vehicle.manufactureYear && !vehicle.model && ` • ${vehicle.manufactureYear}`}
                {!vehicle.manufactureYear && vehicle.model && ` • ${vehicle.model}`}
              </p>
            </div>
            <AddVehicleMaintenanceDocumentButton vehicleId={vehicleId} />
          </div>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Vehicle Information</h2>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <dt className="text-sm font-medium text-slate-500">Name</dt>
              <dd className="mt-1 text-sm text-slate-900">{vehicle.name}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-slate-500">Type</dt>
              <dd className="mt-1 text-sm text-slate-900">{vehicle.vehicleType || 'N/A'}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-slate-500">Capacity</dt>
              <dd className="mt-1 text-sm text-slate-900">{vehicle.capacity} seats</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-slate-500">License Plate</dt>
              <dd className="mt-1 text-sm text-slate-900">{vehicle.licensePlate || 'N/A'}</dd>
            </div>
            {vehicle.manufactureYear && (
              <div>
                <dt className="text-sm font-medium text-slate-500">Manufacture Year</dt>
                <dd className="mt-1 text-sm text-slate-900">{vehicle.manufactureYear}</dd>
              </div>
            )}
            {vehicle.model && (
              <div>
                <dt className="text-sm font-medium text-slate-500">Model</dt>
                <dd className="mt-1 text-sm text-slate-900">{vehicle.model}</dd>
              </div>
            )}
            <div>
              <dt className="text-sm font-medium text-slate-500">Status</dt>
              <dd className="mt-1 text-sm text-slate-900">{vehicle.deletedAt ? 'Deleted' : 'Active'}</dd>
            </div>
          </dl>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-slate-900 mb-4">Maintenance Documents</h2>
          <Suspense fallback={<TableSkeleton rows={3} />}>
            <VehicleMaintenanceDocumentsTableWrapper vehicleId={vehicleId} />
          </Suspense>
        </div>
      </div>
    )
  } catch (error) {
    console.error('Error loading vehicle maintenance page:', error)
    notFound()
  }
}

async function VehicleMaintenanceDocumentsTableWrapper({ vehicleId }: { vehicleId: string }) {
  try {
    if (!vehicleId || typeof vehicleId !== 'string') {
      return null
    }
    const documents = await getVehicleMaintenanceDocuments(vehicleId)
    return <VehicleMaintenanceDocumentsTable documents={documents} vehicleId={vehicleId} />
  } catch (error) {
    console.error('Error loading maintenance documents:', error)
    return null
  }
}

