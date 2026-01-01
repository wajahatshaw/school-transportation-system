'use client'

import { useCallback } from 'react'
import { Driver } from '@prisma/client'
import { getDrivers } from '@/lib/actions'
import { DriversTable } from '@/components/DriversTable'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { TableSkeleton } from '@/components/ui/skeleton'

export function DriversPageClient() {
  const queryClient = useQueryClient()

  const driversQuery = useQuery<Driver[]>({
    queryKey: ['drivers'],
    queryFn: getDrivers,
  })

  const handleUpdate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['drivers'] })
  }, [queryClient])

  if (driversQuery.isLoading && !driversQuery.data) {
    return <TableSkeleton />
  }

  return <DriversTable drivers={driversQuery.data ?? []} onUpdate={handleUpdate} />
}
