'use client'

import { useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Driver } from '@prisma/client'
import { getDrivers } from '@/lib/actions'
import { DriversTable } from '@/components/DriversTable'

interface DriversPageClientProps {
  initialDrivers: Driver[]
}

export function DriversPageClient({ initialDrivers }: DriversPageClientProps) {
  const [drivers, setDrivers] = useState(initialDrivers)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  // Sync state when props change (after router.refresh())
  useEffect(() => {
    setDrivers(initialDrivers)
  }, [initialDrivers])

  const handleUpdate = () => {
    startTransition(async () => {
      try {
        const updatedDrivers = await getDrivers()
        setDrivers(updatedDrivers)
        router.refresh()
      } catch (error) {
        console.error('Failed to refresh drivers:', error)
      }
    })
  }

  return <DriversTable drivers={drivers} onUpdate={handleUpdate} />
}
