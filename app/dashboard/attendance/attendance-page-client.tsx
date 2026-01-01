'use client'

import { useMemo, useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Calendar, Filter, ChevronDown } from 'lucide-react'
import { getRouteTrips, getRoutes, getDrivers } from '@/lib/actions'
import { Button } from '@/components/ui/button'
import { AttendanceHistoryTable } from '@/components/AttendanceHistoryTable'
import { toast } from 'sonner'
import { Skeleton } from '@/components/ui/skeleton'

export function AttendancePageClient({ role }: { role: string }) {
  const router = useRouter()
  const [trips, setTrips] = useState<any[]>([])
  const [routes, setRoutes] = useState<any[]>([])
  const [drivers, setDrivers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [metaLoading, setMetaLoading] = useState(false)
  const [hasAppliedOnce, setHasAppliedOnce] = useState(false)
  const isDriver = role === 'driver'
  const loadSeq = useRef(0)
  
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
    if (isDriver) {
      loadTrips()
      return
    }
    // Admin: load metadata + initial trips once. After that, only Apply reloads trips.
    ;(async () => {
      await Promise.all([loadMetadata(), loadTrips()])
      setHasAppliedOnce(true)
    })()
  }, [])

  const loadMetadata = async () => {
    const seq = ++loadSeq.current
    try {
      setMetaLoading(true)
      const [routesData, driversData] = await Promise.all([
        getRoutes(),
        getDrivers()
      ])
      if (seq !== loadSeq.current) return
      setRoutes(routesData.filter(r => !r.deletedAt))
      setDrivers(driversData.filter(d => !d.deletedAt))
    } catch (error) {
      toast.error('Failed to load filters')
    } finally {
      if (seq === loadSeq.current) setMetaLoading(false)
    }
  }

  const loadTrips = async () => {
    try {
      setLoading(true)
      const filters: any = isDriver
        ? (() => {
            const today = new Date()
            const future = new Date()
            future.setDate(future.getDate() + 14) // show next 2 weeks (upcoming read-only)
            return {
              startDate: toLocalYyyyMmDd(today),
              endDate: toLocalYyyyMmDd(future),
              includeConfirmed: true,
              sort: 'asc'
            }
          })()
        : {
            startDate,
            endDate,
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
    if (!isDriver) {
      // Clear triggers an immediate refresh (admin)
      loadTrips()
      setHasAppliedOnce(true)
    }
  }

  const routeOptions = useMemo(() => routes, [routes])
  const driverOptions = useMemo(() => drivers, [drivers])

  const inputBase =
    'w-full h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2'
  const selectBase =
    'w-full h-10 rounded-lg border border-slate-300 bg-white pl-3 pr-10 text-sm text-slate-900 shadow-sm outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2 appearance-none'

  return (
    <div className="space-y-6">
      {/* Filters (hidden for drivers) */}
      {!isDriver && (
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-5">
          <div className="h-9 w-9 rounded-lg bg-slate-100 flex items-center justify-center">
            <Filter className="h-5 w-5 text-slate-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Filters</h2>
            <p className="text-xs text-slate-500">Adjust filters, then click Apply to refresh results.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-slate-700">
              Start Date
            </label>
            <div className="relative">
              <Calendar className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className={`${inputBase} pl-10`}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-slate-700">
              End Date
            </label>
            <div className="relative">
              <Calendar className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className={`${inputBase} pl-10`}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-slate-700">
              Route
            </label>
            <div className="relative">
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <select
                value={selectedRoute}
                onChange={(e) => setSelectedRoute(e.target.value)}
                className={selectBase}
                disabled={metaLoading}
              >
                <option value="">
                  {metaLoading ? 'Loading routes…' : 'All Routes'}
                </option>
                {routeOptions.map((route) => (
                  <option key={route.id} value={route.id}>
                    {route.name}
                  </option>
                ))}
              </select>
              {metaLoading && <Skeleton className="absolute inset-0 rounded-lg opacity-20" />}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-slate-700">
              Driver
            </label>
            <div className="relative">
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <select
                value={selectedDriver}
                onChange={(e) => setSelectedDriver(e.target.value)}
                className={selectBase}
                disabled={metaLoading}
              >
                <option value="">
                  {metaLoading ? 'Loading drivers…' : 'All Drivers'}
                </option>
                {driverOptions.map((driver) => (
                  <option key={driver.id} value={driver.id}>
                    {driver.firstName} {driver.lastName}
                  </option>
                ))}
              </select>
              {metaLoading && <Skeleton className="absolute inset-0 rounded-lg opacity-20" />}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-slate-700">
              Type
            </label>
            <div className="relative">
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value as 'AM' | 'PM' | '')}
                className={selectBase}
              >
                <option value="">AM & PM</option>
                <option value="AM">AM Only</option>
                <option value="PM">PM Only</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mt-5">
          <Button
            onClick={async () => {
              await loadTrips()
              setHasAppliedOnce(true)
            }}
            size="sm"
            disabled={loading}
          >
            {loading && !hasAppliedOnce ? 'Loading…' : 'Apply Filters'}
          </Button>
          <Button onClick={handleClearFilters} variant="outline" size="sm" disabled={loading}>
            Clear Filters
          </Button>
          <div className="ml-auto text-xs text-slate-500 flex items-center">
            {metaLoading ? 'Loading lists…' : `${routeOptions.length} routes • ${driverOptions.length} drivers`}
          </div>
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
          {loading && (
            <>
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="rounded-lg border border-slate-200 bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-44" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                    <Skeleton className="h-6 w-20 rounded-full" />
                  </div>
                  <Skeleton className="h-3 w-40 mt-3" />
                </div>
              ))}
            </>
          )}

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

function toLocalYyyyMmDd(date: Date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

