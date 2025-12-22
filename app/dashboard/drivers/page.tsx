'use client'

import { useEffect, useState } from 'react'
import { getDrivers } from '@/lib/actions'
import { DriversTable } from '@/components/DriversTable'
import { AddDriverButton } from '@/components/AddDriverButton'
import { TableSkeleton } from '@/components/ui/skeleton'
import { useDataCache } from '@/lib/data-cache'

export default function DriversPage() {
  const { cache, setDrivers } = useDataCache()
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    // Only fetch if we don't have cached data
    if (!cache.drivers) {
      loadDrivers()
    }
  }, [cache.drivers])

  const loadDrivers = async () => {
    try {
      setIsLoading(true)
      const data = await getDrivers()
      setDrivers(data)
    } catch (error) {
      console.error('Failed to load drivers:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Drivers</h1>
          <p className="text-slate-600 mt-1">Manage driver records and compliance</p>
        </div>
        <AddDriverButton onSuccess={loadDrivers} />
      </div>

      {isLoading || !cache.drivers ? (
        <TableSkeleton />
      ) : (
        <DriversTable drivers={cache.drivers} onUpdate={loadDrivers} />
      )}
    </div>
  )
}
