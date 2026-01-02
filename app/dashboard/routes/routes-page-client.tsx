'use client'

import { useRouter } from 'next/navigation'
import { RoutesTable } from '@/components/RoutesTable'

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

interface RoutesPageClientProps {
  initialRoutes: RouteWithRelations[]
  vehicles: Vehicle[]
  drivers: Driver[]
}

export function RoutesPageClient({ initialRoutes, vehicles, drivers }: RoutesPageClientProps) {
  const router = useRouter()

  const handleUpdate = () => {
    router.refresh()
  }

  return <RoutesTable routes={initialRoutes} vehicles={vehicles} drivers={drivers} onUpdate={handleUpdate} />
}

