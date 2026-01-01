import { Suspense } from 'react'
import { AddRouteButton } from '@/components/AddRouteButton'
import { RoutesPageClient } from './routes-page-client'

export default async function RoutesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Routes</h1>
          <p className="text-slate-600 mt-1">Manage transportation routes and schedules</p>
        </div>
        <AddRouteButton />
      </div>

      <RoutesPageClient />
    </div>
  )
}
