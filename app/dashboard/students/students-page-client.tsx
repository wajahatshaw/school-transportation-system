'use client'

import { useCallback } from 'react'
import { Driver, Student, Vehicle } from '@prisma/client'
import { getStudents } from '@/lib/actions'
import { StudentsTable } from '@/components/StudentsTable'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { TableSkeleton } from '@/components/ui/skeleton'

interface StudentsPageClientProps {
  drivers: Driver[]
  vehicles: Vehicle[]
  tenantName: string
}

export function StudentsPageClient({ drivers, vehicles, tenantName }: StudentsPageClientProps) {
  const queryClient = useQueryClient()

  const studentsQuery = useQuery<Student[]>({
    queryKey: ['students'],
    queryFn: async () => {
      const data = await getStudents()
      return data as unknown as Student[]
    },
  })

  const handleUpdate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['students'] })
    // student route assignment can affect routes view
    queryClient.invalidateQueries({ queryKey: ['routes'] })
  }, [queryClient])

  if (studentsQuery.isLoading && !studentsQuery.data) {
    return <TableSkeleton />
  }

  return <StudentsTable students={studentsQuery.data ?? []} drivers={drivers} vehicles={vehicles} onUpdate={handleUpdate} tenantName={tenantName} />
}
