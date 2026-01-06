import { Suspense } from 'react'
import { getDrivers, getStudents, getVehicles } from '@/lib/actions'
import { StudentsTable } from '@/components/StudentsTable'
import { AddStudentButton } from '@/components/AddStudentButton'
import { TableSkeleton } from '@/components/ui/skeleton'
import { StudentsPageClient } from './students-page-client'

export default async function StudentsPage() {
  const [drivers, vehicles] = await Promise.all([getDrivers(), getVehicles()])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Students</h1>
          <p className="text-slate-600 mt-1">Manage student records and information</p>
        </div>
        <AddStudentButton />
      </div>

      <Suspense fallback={<TableSkeleton />}>
        <StudentsTableWrapper drivers={drivers} vehicles={vehicles} />
      </Suspense>
    </div>
  )
}

async function StudentsTableWrapper({
  drivers,
  vehicles,
}: {
  drivers: Awaited<ReturnType<typeof getDrivers>>
  vehicles: Awaited<ReturnType<typeof getVehicles>>
}) {
  const students = await getStudents()
  return <StudentsPageClient initialStudents={students} drivers={drivers} vehicles={vehicles} />
}
