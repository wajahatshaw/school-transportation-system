'use client'

import { VehiclesTable } from '@/components/VehiclesTable'
import { getVehicles } from '@/lib/actions'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'
import { TableSkeleton } from '@/components/ui/skeleton'

// Type definition to avoid Prisma client import issues
type Vehicle = {
  id: string
  tenantId: string
  name: string
  capacity: number
  licensePlate: string | null
  vehicleType: string | null
  manufactureYear: number | null
  model: string | null
  deletedAt: Date | null
  deletedBy: string | null
  createdAt: Date | null
  updatedAt: Date | null
}

export function VehiclesPageClient() {
  const queryClient = useQueryClient()

  const vehiclesQuery = useQuery<Vehicle[]>({
    queryKey: ['vehicles'],
    queryFn: getVehicles as any,
  })

  const handleUpdate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['vehicles'] })
    // vehicle updates can affect routes capacity/assignment display
    queryClient.invalidateQueries({ queryKey: ['routes'] })
  }, [queryClient])

  if (vehiclesQuery.isLoading && !vehiclesQuery.data) {
    return <TableSkeleton />
  }

  return <VehiclesTable vehicles={vehiclesQuery.data ?? []} onUpdate={handleUpdate} />
}

