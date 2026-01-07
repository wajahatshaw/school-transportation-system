'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log error to console for debugging
    console.error('Dashboard error:', error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12">
      <div className="max-w-md w-full text-center">
        <h1 className="text-2xl font-bold text-slate-900 mb-4">Dashboard Error</h1>
        <p className="text-slate-600 mb-6">
          {process.env.NODE_ENV === 'development'
            ? error.message || 'An unexpected error occurred'
            : 'An error occurred while loading the dashboard. Please try again.'}
        </p>
        <div className="flex gap-4 justify-center">
          <Button onClick={() => reset()} variant="default">
            Try again
          </Button>
          <Button onClick={() => window.location.href = '/dashboard'} variant="outline">
            Reload Dashboard
          </Button>
        </div>
      </div>
    </div>
  )
}

