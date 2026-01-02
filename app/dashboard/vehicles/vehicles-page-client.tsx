'use client'

import { useRouter } from 'next/navigation'
import { VehiclesTable } from '@/components/VehiclesTable'

// Type definition to avoid Prisma client import issues
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

interface VehiclesPageClientProps {
  initialVehicles: Vehicle[]
}

export function VehiclesPageClient({ initialVehicles }: VehiclesPageClientProps) {
  const router = useRouter()

  const handleUpdate = () => {
    router.refresh()
  }

  return <VehiclesTable vehicles={initialVehicles} onUpdate={handleUpdate} />
}

