'use client'

import { useCallback } from 'react'
import { Driver, Student, Vehicle } from '@prisma/client'
import { getStudents, getDrivers, getVehicles } from '@/lib/actions'
import { StudentsTable } from '@/components/StudentsTable'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { TableSkeleton } from '@/components/ui/skeleton'

interface StudentsPageClientProps {
  initialStudents: Student[]
  drivers: Driver[]
  vehicles: Vehicle[]
  tenantName: string
}

export function StudentsPageClient({ initialStudents, drivers, vehicles, tenantName }: StudentsPageClientProps) {
  const queryClient = useQueryClient()

  // Use React Query with initial data from server
  const studentsQuery = useQuery<Student[]>({
    queryKey: ['students'],
    queryFn: getStudents as any,
    initialData: initialStudents,
  })

  const driversQuery = useQuery<Driver[]>({
    queryKey: ['drivers'],
    queryFn: getDrivers as any,
    initialData: drivers,
  })

  const vehiclesQuery = useQuery<Vehicle[]>({
    queryKey: ['vehicles'],
    queryFn: getVehicles as any,
    initialData: vehicles,
  })

  const handleUpdate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['students'] })
    // student route assignment can affect routes view
    queryClient.invalidateQueries({ queryKey: ['routes'] })
  }, [queryClient])

  const isLoading = 
    (studentsQuery.isLoading && !studentsQuery.data) ||
    (driversQuery.isLoading && !driversQuery.data) ||
    (vehiclesQuery.isLoading && !vehiclesQuery.data)

  if (isLoading) {
    return <TableSkeleton />
  }

  return (
    <StudentsTable 
      students={studentsQuery.data ?? []} 
      drivers={driversQuery.data ?? []} 
      vehicles={vehiclesQuery.data ?? []} 
      onUpdate={handleUpdate} 
      tenantName={tenantName} 
    />
  )
}
