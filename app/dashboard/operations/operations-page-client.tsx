'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { MyTripsPageClient } from '../my-trips/my-trips-page-client'
import { AttendancePageClient } from '../attendance/attendance-page-client'

interface OperationsPageClientProps {
  role: string
}

export function OperationsPageClient({ role }: OperationsPageClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const tabFromUrl = searchParams.get('tab') as 'trips' | 'attendance' | null
  const [activeTab, setActiveTab] = useState<'trips' | 'attendance'>(tabFromUrl || 'trips')

  // Sync tab with URL
  useEffect(() => {
    if (tabFromUrl && tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl)
    }
  }, [tabFromUrl, activeTab])

  const handleTabChange = (tab: 'trips' | 'attendance') => {
    setActiveTab(tab)
    // Update URL without navigation
    router.push(`/dashboard/operations?tab=${tab}`, { scroll: false })
  }

  // Render only the active tab content
  if (activeTab === 'trips') {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Trips</h1>
          <p className="text-slate-600 mt-2">
            Manage today's route trips and mark student attendance
          </p>
        </div>
        <MyTripsPageClient />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">
          {role === 'driver' ? "Today's Attendance" : 'Attendance History'}
        </h1>
        <p className="text-slate-600 mt-2">
          {role === 'driver'
            ? 'Mark attendance for your assigned trips. Upcoming trips are read-only.'
            : 'View and manage all route trip attendance records'}
        </p>
      </div>
      <AttendancePageClient role={role} />
    </div>
  )
}

