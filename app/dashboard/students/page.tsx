import { Suspense } from 'react'
import { getDrivers, getStudents, getVehicles, getCurrentTenant } from '@/lib/actions'
import { AddStudentButton } from '@/components/AddStudentButton'
import { TableSkeleton } from '@/components/ui/skeleton'
import { StudentsPageClient } from './students-page-client'

export default async function StudentsPage() {
  const [drivers, vehicles, tenant] = await Promise.all([getDrivers(), getVehicles(), getCurrentTenant()])

  return (
    <div className="space-y-4 sm:space-y-6 w-full">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">Students</h1>
          <p className="text-sm sm:text-base text-slate-600 mt-1">Manage student records and information</p>
        </div>
        <div className="shrink-0">
          <AddStudentButton tenantName={tenant?.name || ''} />
        </div>
      </div>

      <Suspense fallback={<TableSkeleton />}>
        <StudentsTableWrapper drivers={drivers} vehicles={vehicles} tenantName={tenant?.name || ''} />
      </Suspense>
    </div>
  )
}

async function StudentsTableWrapper({
  drivers,
  vehicles,
  tenantName,
}: {
  drivers: Awaited<ReturnType<typeof getDrivers>>
  vehicles: Awaited<ReturnType<typeof getVehicles>>
  tenantName: string
}) {
  const students = await getStudents()
  return <StudentsPageClient initialStudents={students} drivers={drivers} vehicles={vehicles} tenantName={tenantName} />
}
