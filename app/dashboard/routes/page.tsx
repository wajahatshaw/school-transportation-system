import { Suspense } from 'react'
import { getRoutes, getVehicles, getDrivers } from '@/lib/actions'
import { RoutesTable } from '@/components/RoutesTable'
import { AddRouteButton } from '@/components/AddRouteButton'
import { TableSkeleton } from '@/components/ui/skeleton'
import { RoutesPageClient } from './routes-page-client'

export default async function RoutesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Routes</h1>
          <p className="text-slate-600 mt-1">Manage transportation routes and schedules</p>
        </div>
        <Suspense fallback={<div className="h-10 w-32 bg-slate-200 rounded animate-pulse" />}>
          <AddRouteButtonWrapper />
        </Suspense>
      </div>

      <Suspense fallback={<TableSkeleton />}>
        <RoutesTableWrapper />
      </Suspense>
    </div>
  )
}

async function AddRouteButtonWrapper() {
  const [vehicles, drivers] = await Promise.all([
    getVehicles(),
    getDrivers()
  ])
  return <AddRouteButton vehicles={vehicles} drivers={drivers} />
}

async function RoutesTableWrapper() {
  const [routes, vehicles, drivers] = await Promise.all([
    getRoutes(),
    getVehicles(),
    getDrivers()
  ])
  return <RoutesPageClient initialRoutes={routes} vehicles={vehicles} drivers={drivers} />
}

