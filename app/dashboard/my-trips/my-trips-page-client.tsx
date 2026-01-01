'use client'

import { useMemo, useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { ClipboardPlus } from 'lucide-react'
import { getRouteTrips, getRoutes, getDrivers, createRouteTrip } from '@/lib/actions'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { AttendanceHistoryTable } from '@/components/AttendanceHistoryTable'

type RouteType = 'AM' | 'PM'

type TripsCacheEntry = {
  activeTrips: any[]
  pastTrips: any[]
  loaded: boolean
}

export function MyTripsPageClient() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<RouteType>('AM')
  const [activeTrips, setActiveTrips] = useState<any[]>([])
  const [pastTrips, setPastTrips] = useState<any[]>([])
  const [routes, setRoutes] = useState<any[]>([]) // all routes (non-deleted)
  const [routesLoading, setRoutesLoading] = useState(true)
  const [drivers, setDrivers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const loadSeq = useRef(0)
  const tripsCacheRef = useRef<Record<RouteType, TripsCacheEntry>>({
    AM: { activeTrips: [], pastTrips: [], loaded: false },
    PM: { activeTrips: [], pastTrips: [], loaded: false }
  })
  const [createForm, setCreateForm] = useState({
    routeId: '',
    tripDate: new Date().toISOString().slice(0, 10), // YYYY-MM-DD
    routeType: 'AM' as RouteType,
    driverId: '',
  })

  useEffect(() => {
    // Switching tabs should NOT refetch every time.
    // If we've already loaded this tab once, use cached data instantly.
    const cached = tripsCacheRef.current[activeTab]
    if (cached?.loaded) {
      setActiveTrips(cached.activeTrips)
      setPastTrips(cached.pastTrips)
      setLoading(false)
      return
    }
    // First time loading this tab: fetch with loader.
    loadData({ tab: activeTab, force: true, showLoader: true })
  }, [activeTab])

  // Load routes once (for Create Trip modal) to avoid slow dropdown on open
  useEffect(() => {
    const loadRoutes = async () => {
      try {
        setRoutesLoading(true)
        const routesData = await getRoutes()
        setRoutes(routesData.filter(r => !r.deletedAt))
      } catch {
        // non-blocking
      } finally {
        setRoutesLoading(false)
      }
    }
    loadRoutes()
  }, [])

  const loadData = async (opts?: { tab?: RouteType; force?: boolean; showLoader?: boolean }) => {
    const tab = opts?.tab ?? activeTab
    const force = !!opts?.force
    const showLoader = opts?.showLoader ?? true
    const cached = tripsCacheRef.current[tab]
    if (!force && cached?.loaded) {
      setActiveTrips(cached.activeTrips)
      setPastTrips(cached.pastTrips)
      setLoading(false)
      return
    }

    const seq = ++loadSeq.current
    try {
      if (showLoader) {
        setLoading(true)
        // Clear existing data so we don't flash stale trips while loading
        setActiveTrips([])
        setPastTrips([])
      }
      const todayStr = toLocalYyyyMmDd(new Date())
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      const yesterdayStr = toLocalYyyyMmDd(yesterday)

      const [activeTripsRaw, pastTripsRaw] = await Promise.all([
        getRouteTrips({
          startDate: todayStr, // active + upcoming only (no past) - local date string
          routeType: tab,
          includeConfirmed: true,
          sort: 'asc',
        }),
        getRouteTrips({
          endDate: yesterdayStr, // past only - local date string
          routeType: tab,
          includeConfirmed: true,
          sort: 'desc',
          limit: 50
        })
      ])

      // Ignore out-of-order responses (tab switching fast)
      if (seq !== loadSeq.current) return

      tripsCacheRef.current[tab] = {
        activeTrips: activeTripsRaw,
        pastTrips: pastTripsRaw,
        loaded: true
      }

      setActiveTrips(activeTripsRaw)
      setPastTrips(pastTripsRaw)
    } catch (error) {
      toast.error('Failed to load trips')
    } finally {
      if (seq === loadSeq.current) setLoading(false)
    }
  }

  // Load drivers once (used in Create Trip modal)
  useEffect(() => {
    const loadDrivers = async () => {
      try {
        const driversData = await getDrivers()
        setDrivers(driversData.filter(d => !d.deletedAt))
      } catch {
        // Non-blocking
      }
    }
    loadDrivers()
  }, [])

  const openCreateModal = () => {
    setCreateForm({
      routeId: '',
      tripDate: new Date().toISOString().slice(0, 10),
      routeType: activeTab,
      driverId: '',
    })
    setCreateOpen(true)
  }

  const submitCreateModal = async () => {
    if (!createForm.routeId) {
      toast.error('Please select a route')
      return
    }
    if (!createForm.tripDate) {
      toast.error('Please select a date')
      return
    }

    try {
      setCreating(true)
      const tripDate = new Date(`${createForm.tripDate}T00:00:00`)
      const trip = await createRouteTrip({
        routeId: createForm.routeId,
        tripDate,
        routeType: createForm.routeType,
        driverId: createForm.driverId || undefined,
      })

      toast.success('Trip created')
      setCreateOpen(false)
      // Do not auto-navigate; refresh only the current tab cache (no loader flash)
      await loadData({ tab: activeTab, force: true, showLoader: false })
    } catch (error) {
      toast.error('Failed to create trip', {
        description: error instanceof Error ? error.message : 'Please try again'
      })
    } finally {
      setCreating(false)
    }
  }

  const handleOpenTrip = (tripId: string) => {
    // Trip execution happens in Attendance trip detail
    router.push(`/dashboard/attendance/${tripId}`)
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const routesForType = useMemo(() => {
    return routes.filter((r) => r.type === createForm.routeType)
  }, [routes, createForm.routeType])

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="border-b border-slate-200">
        <nav className="-mb-px flex gap-8">
          <button
            onClick={() => setActiveTab('AM')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'AM'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            Morning Routes (AM)
          </button>
          <button
            onClick={() => setActiveTab('PM')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'PM'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            Afternoon Routes (PM)
          </button>
        </nav>
      </div>

      {/* Create Trip (Form) */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-slate-600">
          Create trips for any date/type, then manage attendance from the Attendance tab.
        </div>
        <Button onClick={openCreateModal} className="gap-2">
          <ClipboardPlus className="h-4 w-4" />
          Create Trip
        </Button>
      </div>

      <div>
        <h2 className="text-xl font-semibold text-slate-900 mb-4">Active & Upcoming Trips</h2>

        {activeTrips.length === 0 && !loading ? (
        <EmptyState
          icon={<div className="text-6xl">🚌</div>}
          title="No active or upcoming trips"
          description={`Create a new ${activeTab} trip to get started.`}
        />
        ) : (
          <>
            <AttendanceHistoryTable trips={activeTrips} loading={loading} onTripClick={handleOpenTrip} />
          </>
        )}
      </div>

      <div>
        <h2 className="text-xl font-semibold text-slate-900 mb-4">Past Trips</h2>

        {pastTrips.length === 0 && !loading ? (
          <div className="text-sm text-slate-600">
            No past trips found for {activeTab}.
          </div>
        ) : (
          <AttendanceHistoryTable trips={pastTrips} loading={loading} onTripClick={handleOpenTrip} />
        )}
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent onClose={() => setCreateOpen(false)} className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>Create Trip</DialogTitle>
            <DialogDescription>
              Create a route trip for a specific date and AM/PM type. After creating, open the trip to add students and mark attendance.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Trip Type</label>
                <select
                  value={createForm.routeType}
                  onChange={(e) =>
                    setCreateForm((p) => ({ ...p, routeType: e.target.value as RouteType, routeId: '' }))
                  }
                className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
                  disabled={creating}
                >
                  <option value="AM">AM</option>
                  <option value="PM">PM</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Trip Date</label>
                <input
                  type="date"
                  value={createForm.tripDate}
                  onChange={(e) => setCreateForm((p) => ({ ...p, tripDate: e.target.value }))}
                  className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
                  disabled={creating}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Route</label>
              <select
                value={createForm.routeId}
                onChange={(e) => setCreateForm((p) => ({ ...p, routeId: e.target.value }))}
                className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
                disabled={creating || routesLoading}
              >
                <option value="">
                  {routesLoading ? 'Loading routes…' : 'Select a route…'}
                </option>
                {routesForType.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-slate-500">
                Only routes matching the selected trip type are shown.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Driver (optional)</label>
              <select
                value={createForm.driverId}
                onChange={(e) => setCreateForm((p) => ({ ...p, driverId: e.target.value }))}
                className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
                disabled={creating}
              >
                <option value="">Use route default / Unassigned</option>
                {drivers.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.firstName} {d.lastName}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => setCreateOpen(false)}
                disabled={creating}
              >
                Cancel
              </Button>
              <Button
                type="button"
                className="flex-1"
                onClick={submitCreateModal}
                disabled={creating}
              >
                {creating ? 'Creating...' : 'Create Trip'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function toLocalYyyyMmDd(date: Date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

