'use client'

import { RoutesTable } from '@/components/RoutesTable'
import { getRoutes, getVehicles, getDrivers } from '@/lib/actions'
import { useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { TableSkeleton } from '@/components/ui/skeleton'

// Type definitions to avoid Prisma client import issues
type Vehicle = {
  id: string
  tenantId: string
  name: string
  capacity: number
  licensePlate: string | null
  vehicleType: string | null
  deletedAt: Date | null
  deletedBy: string | null
  createdAt: Date | null
  updatedAt: Date | null
}

type Driver = {
  id: string
  tenantId: string
  firstName: string
  lastName: string
  licenseNumber: string | null
  deletedAt: Date | null
  deletedBy: string | null
  createdAt: Date | null
  updatedAt: Date | null
}

type Route = {
  id: string
  tenantId: string
  name: string
  type: string
  vehicleId: string | null
  driverId: string | null
  stops: any
  deletedAt: Date | null
  deletedBy: string | null
  createdAt: Date | null
  updatedAt: Date | null
}

interface RouteWithRelations extends Route {
  vehicle?: Vehicle | null
  driver?: Driver | null
}

export function RoutesPageClient() {
  const queryClient = useQueryClient()

  const routesQuery = useQuery<RouteWithRelations[]>({
    queryKey: ['routes'],
    queryFn: getRoutes as any,
  })

  const vehiclesQuery = useQuery<Vehicle[]>({
    queryKey: ['vehicles'],
    queryFn: getVehicles as any,
  })

  const driversQuery = useQuery<Driver[]>({
    queryKey: ['drivers'],
    queryFn: getDrivers as any,
  })

  const handleUpdate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['routes'] })
  }, [queryClient])

  const isLoading = (routesQuery.isLoading && !routesQuery.data) ||
    (vehiclesQuery.isLoading && !vehiclesQuery.data) ||
    (driversQuery.isLoading && !driversQuery.data)

  if (isLoading) {
    return <TableSkeleton />
  }

  return (
    <RoutesTable
      routes={routesQuery.data ?? []}
      vehicles={vehiclesQuery.data ?? []}
      drivers={driversQuery.data ?? []}
      onUpdate={handleUpdate}
    />
  )
}

