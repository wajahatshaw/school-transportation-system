'use client'

import { useCallback } from 'react'
import { Driver, Student, Vehicle } from '@prisma/client'
import { getStudents, getDrivers, getVehicles, getCurrentTenant } from '@/lib/actions'
import { StudentsTable } from '@/components/StudentsTable'
import { AddStudentButton } from '@/components/AddStudentButton'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { TableSkeleton } from '@/components/ui/skeleton'

export function StudentsPageClient() {
  const queryClient = useQueryClient()

  const studentsQuery = useQuery<Student[]>({
    queryKey: ['students'],
    queryFn: getStudents as any,
  })

  const driversQuery = useQuery<Driver[]>({
    queryKey: ['drivers'],
    queryFn: getDrivers as any,
  })

  const vehiclesQuery = useQuery<Vehicle[]>({
    queryKey: ['vehicles'],
    queryFn: getVehicles as any,
  })

  const tenantQuery = useQuery({
    queryKey: ['current-tenant'],
    queryFn: getCurrentTenant,
  })

  const handleUpdate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['students'] })
    // student route assignment can affect routes view
    queryClient.invalidateQueries({ queryKey: ['routes'] })
  }, [queryClient])

  const isLoading = 
    (studentsQuery.isLoading && !studentsQuery.data) ||
    (driversQuery.isLoading && !driversQuery.data) ||
    (vehiclesQuery.isLoading && !vehiclesQuery.data) ||
    (tenantQuery.isLoading && !tenantQuery.data)

  if (isLoading) {
    return <TableSkeleton />
  }

  return (
    <>
      <div className="flex items-center justify-end mb-4">
        <AddStudentButton tenantName={tenantQuery.data?.name} />
      </div>
      <StudentsTable 
        students={studentsQuery.data ?? []} 
        drivers={driversQuery.data ?? []} 
        vehicles={vehiclesQuery.data ?? []} 
        onUpdate={handleUpdate} 
        tenantName={tenantQuery.data?.name || ''} 
      />
    </>
  )
}
