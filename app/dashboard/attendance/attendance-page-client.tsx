'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Calendar, Filter, Download } from 'lucide-react'
import { getRouteTrips, getRoutes, getDrivers } from '@/lib/actions'
import { Button } from '@/components/ui/button'
import { AttendanceHistoryTable } from '@/components/AttendanceHistoryTable'
import { toast } from 'sonner'

export function AttendancePageClient({ role }: { role: string }) {
  const router = useRouter()
  const [trips, setTrips] = useState<any[]>([])
  const [routes, setRoutes] = useState<any[]>([])
  const [drivers, setDrivers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const isDriver = role === 'driver'
  
  // Filters
  const [startDate, setStartDate] = useState(() => {
    const date = new Date()
    date.setDate(date.getDate() - 7) // Last 7 days
    return date.toISOString().split('T')[0]
  })
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0]
  })
  const [selectedRoute, setSelectedRoute] = useState('')
  const [selectedDriver, setSelectedDriver] = useState('')
  const [selectedType, setSelectedType] = useState<'AM' | 'PM' | ''>('')

  useEffect(() => {
    if (!isDriver) loadMetadata()
  }, [])

  useEffect(() => {
    loadTrips()
  }, [startDate, endDate, selectedRoute, selectedDriver, selectedType])

  const loadMetadata = async () => {
    try {
      const [routesData, driversData] = await Promise.all([
        getRoutes(),
        getDrivers()
      ])
      setRoutes(routesData.filter(r => !r.deletedAt))
      setDrivers(driversData.filter(d => !d.deletedAt))
    } catch (error) {
      toast.error('Failed to load filters')
    }
  }

  const loadTrips = async () => {
    try {
      setLoading(true)
      const filters: any = isDriver
        ? (() => {
            const today = new Date()
            today.setHours(0, 0, 0, 0)
            const future = new Date(today)
            future.setDate(future.getDate() + 14) // show next 2 weeks (upcoming read-only)
            return {
              startDate: today,
              endDate: future,
              includeConfirmed: true,
              sort: 'asc'
            }
          })()
        : {
            startDate: new Date(startDate),
            endDate: new Date(endDate),
            includeConfirmed: true
          }
      
      if (!isDriver) {
        if (selectedRoute) filters.routeId = selectedRoute
        if (selectedDriver) filters.driverId = selectedDriver
        if (selectedType) filters.routeType = selectedType
      }
      
      const tripsData = await getRouteTrips(filters)
      setTrips(tripsData)
    } catch (error) {
      toast.error('Failed to load attendance data')
    } finally {
      setLoading(false)
    }
  }

  const handleTripClick = (tripId: string) => {
    router.push(`/dashboard/attendance/${tripId}`)
  }

  const handleClearFilters = () => {
    const date = new Date()
    date.setDate(date.getDate() - 7)
    setStartDate(date.toISOString().split('T')[0])
    setEndDate(new Date().toISOString().split('T')[0])
    setSelectedRoute('')
    setSelectedDriver('')
    setSelectedType('')
  }

  return (
    <div className="space-y-6">
      {/* Filters (hidden for drivers) */}
      {!isDriver && (
        <div className="bg-white border border-slate-200 rounded-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="h-5 w-5 text-slate-400" />
            <h2 className="text-lg font-semibold text-slate-900">Filters</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              End Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Route
            </label>
            <select
              value={selectedRoute}
              onChange={(e) => setSelectedRoute(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
            >
              <option value="">All Routes</option>
              {routes.map((route) => (
                <option key={route.id} value={route.id}>
                  {route.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Driver
            </label>
            <select
              value={selectedDriver}
              onChange={(e) => setSelectedDriver(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
            >
              <option value="">All Drivers</option>
              {drivers.map((driver) => (
                <option key={driver.id} value={driver.id}>
                  {driver.firstName} {driver.lastName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Type
            </label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value as 'AM' | 'PM' | '')}
              className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
            >
              <option value="">AM & PM</option>
              <option value="AM">AM Only</option>
              <option value="PM">PM Only</option>
            </select>
          </div>
        </div>

          <div className="flex gap-2 mt-4">
            <Button onClick={loadTrips} size="sm">
              Apply Filters
            </Button>
            <Button onClick={handleClearFilters} variant="outline" size="sm">
              Clear Filters
            </Button>
          </div>
        </div>
      )}

      {/* Results Summary */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-slate-600">
          {loading ? 'Loading...' : `Found ${trips.length} trip(s)`}
        </div>
      </div>

      {/* Trips Table (Admin) / Mobile cards (Driver) */}
      {isDriver ? (
        <div className="space-y-3">
          {trips.map((trip) => {
            const tripDate = new Date(trip.tripDate)
            const today = new Date()
            today.setHours(0, 0, 0, 0)
            const d = new Date(tripDate)
            d.setHours(0, 0, 0, 0)
            const isToday = d.getTime() === today.getTime()
            const isPast = d.getTime() < today.getTime()
            const isConfirmed = !!trip.confirmedAt
            const isDisabled = isConfirmed
            return (
              <button
                key={trip.id}
                type="button"
                onClick={() => handleTripClick(trip.id)}
                disabled={isDisabled}
                className={[
                  'w-full text-left rounded-lg border p-4 transition-colors',
                  isDisabled ? 'bg-slate-50 border-slate-200 text-slate-500' : 'bg-white border-slate-200 hover:bg-slate-50',
                ].join(' ')}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">
                      {trip.route?.name || 'Unknown Route'} • {trip.routeType}
                    </div>
                    <div className="text-xs text-slate-600 mt-1">
                      {tripDate.toLocaleDateString()}
                    </div>
                  </div>
                  <div className="text-xs">
                    {isConfirmed ? (
                      <span className="inline-flex rounded-full bg-emerald-100 px-2 py-1 text-emerald-800">
                        Confirmed
                      </span>
                    ) : isToday ? (
                      <span className="inline-flex rounded-full bg-blue-100 px-2 py-1 text-blue-800">
                        Today
                      </span>
                    ) : isPast ? (
                      <span className="inline-flex rounded-full bg-slate-200 px-2 py-1 text-slate-700">
                        Past
                      </span>
                    ) : (
                      <span className="inline-flex rounded-full bg-slate-200 px-2 py-1 text-slate-700">
                        Upcoming
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-xs text-slate-600 mt-2">
                    {isConfirmed
                      ? 'Locked'
                      : isPast
                        ? 'Tap to review / update attendance'
                        : 'Tap to mark attendance'}
                </div>
              </button>
            )
          })}
        </div>
      ) : (
        <AttendanceHistoryTable
          trips={trips}
          loading={loading}
          onTripClick={handleTripClick}
        />
      )}
    </div>
  )
}

