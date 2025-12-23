import { Suspense } from 'react'
import { getDrivers } from '@/lib/actions'
import { DriversTable } from '@/components/DriversTable'
import { AddDriverButton } from '@/components/AddDriverButton'
import { TableSkeleton } from '@/components/ui/skeleton'
import { DriversPageClient } from './drivers-page-client'

export default async function DriversPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Drivers</h1>
          <p className="text-slate-600 mt-1">Manage driver records and compliance</p>
        </div>
        <AddDriverButton />
      </div>

      <Suspense fallback={<TableSkeleton />}>
        <DriversTableWrapper />
      </Suspense>
    </div>
  )
}

async function DriversTableWrapper() {
  const drivers = await getDrivers()
  return <DriversPageClient initialDrivers={drivers} />
}
