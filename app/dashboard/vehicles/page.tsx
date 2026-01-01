import { Suspense } from 'react'
import { AddVehicleButton } from '@/components/AddVehicleButton'
import { VehiclesPageClient } from './vehicles-page-client'

export default async function VehiclesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Vehicles</h1>
          <p className="text-slate-600 mt-1">Manage vehicle fleet and capacity</p>
        </div>
        <AddVehicleButton />
      </div>

      <VehiclesPageClient />
    </div>
  )
}
