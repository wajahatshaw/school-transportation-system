'use client'

import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { getRouteTrips, getRoutes, getDrivers, getStudents } from '@/lib/actions'

/**
 * Prefetches all critical data for Trips and Attendance tabs on dashboard mount.
 * This ensures zero loading states when switching between tabs.
 */
export function DataPrefetcher({ role }: { role: string }) {
  const queryClient = useQueryClient()
  const isDriver = role === 'driver'

  useEffect(() => {
    // Prefetch all data immediately on dashboard load
    const prefetchData = async () => {
      const today = new Date()
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      const future = new Date()
      future.setDate(future.getDate() + 14)

      const todayStr = toLocalYyyyMmDd(today)
      const yesterdayStr = toLocalYyyyMmDd(yesterday)
      const futureStr = toLocalYyyyMmDd(future)
      const last7Days = new Date()
      last7Days.setDate(last7Days.getDate() - 7)
      const last7DaysStr = last7Days.toISOString().split('T')[0]
      const todayIso = today.toISOString().split('T')[0]

      // Build list of queries based on role
      const prefetchPromises = [
        // My Trips - AM tab
        queryClient.prefetchQuery({
          queryKey: ['my-trips', 'AM'],
          queryFn: async () => {
            const [activeTripsRaw, pastTripsRaw] = await Promise.all([
              getRouteTrips({
                startDate: todayStr,
                routeType: 'AM',
                includeConfirmed: true,
                sort: 'asc',
              }),
              getRouteTrips({
                endDate: yesterdayStr,
                routeType: 'AM',
                includeConfirmed: true,
                sort: 'desc',
                limit: 50,
              }),
            ])
            return { activeTrips: activeTripsRaw, pastTrips: pastTripsRaw }
          },
        }),

        // My Trips - PM tab
        queryClient.prefetchQuery({
          queryKey: ['my-trips', 'PM'],
          queryFn: async () => {
            const [activeTripsRaw, pastTripsRaw] = await Promise.all([
              getRouteTrips({
                startDate: todayStr,
                routeType: 'PM',
                includeConfirmed: true,
                sort: 'asc',
              }),
              getRouteTrips({
                endDate: yesterdayStr,
                routeType: 'PM',
                includeConfirmed: true,
                sort: 'desc',
                limit: 50,
              }),
            ])
            return { activeTrips: activeTripsRaw, pastTrips: pastTripsRaw }
          },
        }),
      ]

      // Role-specific prefetching
      if (isDriver) {
        // Driver only needs their upcoming trips
        prefetchPromises.push(
          queryClient.prefetchQuery({
            queryKey: ['attendance-trips', 'driver', {
              startDate: todayStr,
              endDate: futureStr,
              includeConfirmed: true,
              sort: 'asc',
            }],
            queryFn: async () => {
              return await getRouteTrips({
                startDate: todayStr,
                endDate: futureStr,
                includeConfirmed: true,
                sort: 'asc',
              })
            },
          })
        )
      } else {
        // Admin needs attendance trips + filters
        prefetchPromises.push(
          // Attendance trips (admin view - last 7 days)
          queryClient.prefetchQuery({
            queryKey: ['attendance-trips', 'admin', {
              startDate: last7DaysStr,
              endDate: todayIso,
              routeId: '',
              driverId: '',
              routeType: '',
            }],
            queryFn: async () => {
              return await getRouteTrips({
                startDate: last7DaysStr,
                endDate: todayIso,
                includeConfirmed: true,
              })
            },
          }),

          // Routes (used by trip creation and filters)
          queryClient.prefetchQuery({
            queryKey: ['routes'],
            queryFn: async () => {
              const routesData = await getRoutes()
              return routesData.filter((r) => !r.deletedAt)
            },
          }),

          // Drivers (used by trip creation and filters)
          queryClient.prefetchQuery({
            queryKey: ['drivers'],
            queryFn: async () => {
              const driversData = await getDrivers()
              return driversData.filter((d) => !d.deletedAt)
            },
          }),

          // Students (used by trip detail pages)
          queryClient.prefetchQuery({
            queryKey: ['students'],
            queryFn: async () => {
              return await getStudents()
            },
          })
        )
      }

      // Prefetch in parallel for maximum speed
      await Promise.all(prefetchPromises)

      console.log('✅ Prefetch complete: Trips and Attendance data cached')
    }

    prefetchData().catch((error) => {
      console.error('❌ Prefetch error:', error)
    })
  }, [queryClient, isDriver])

  // This component doesn't render anything
  return null
}

function toLocalYyyyMmDd(date: Date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

