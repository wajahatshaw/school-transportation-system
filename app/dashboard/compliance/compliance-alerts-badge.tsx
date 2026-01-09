'use client'

import { Bell } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'

async function fetchAlertCount() {
  const res = await fetch('/api/compliance/alerts/count')
  if (!res.ok) {
    throw new Error('Failed to fetch alert count')
  }
  const data = await res.json()
  return data.data
}

export function ComplianceAlertsBadge() {
  const [isOpen, setIsOpen] = useState(false)
  
  const { data: alertCount, isLoading } = useQuery({
    queryKey: ['compliance-alert-count'],
    queryFn: fetchAlertCount,
    refetchInterval: 30000, // Refetch every 30 seconds to catch newly expired documents
    staleTime: 10000, // Consider data stale after 10 seconds
    // Invalidate when expiring documents are refetched to keep in sync
    refetchOnWindowFocus: true,
  })

  const totalAlerts = alertCount?.total || 0
  const expiredCount = alertCount?.expired || 0
  const expiringCount = alertCount?.expiring || 0

  if (isLoading) {
    return (
      <div className="relative">
        <Bell className="h-6 w-6 text-slate-600" />
      </div>
    )
  }

  if (totalAlerts === 0) {
    return (
      <div className="relative">
        <Bell className="h-6 w-6 text-slate-400" />
      </div>
    )
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="relative p-2 hover:bg-slate-100 rounded-lg transition-colors"
        aria-label={`${totalAlerts} compliance alerts`}
      >
        <Bell className="h-6 w-6 text-slate-900" />
        {totalAlerts > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-xs font-bold text-white">
            {totalAlerts > 99 ? '99+' : totalAlerts}
          </span>
        )}
      </button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent onClose={() => setIsOpen(false)} className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-slate-900" />
              Compliance Alerts
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <p className="text-sm text-slate-600 mb-4">
                You have <strong className="text-slate-900">{totalAlerts}</strong> active compliance {totalAlerts === 1 ? 'alert' : 'alerts'}
              </p>
            </div>
            
            <div className="space-y-2">
              {expiredCount > 0 && (
                <button
                  onClick={() => {
                    setIsOpen(false)
                    // Wait for dialog to close, then scroll
                    setTimeout(() => {
                      if (typeof window !== 'undefined' && (window as any).scrollToExpiringDocuments) {
                        (window as any).scrollToExpiringDocuments()
                      }
                    }, 100)
                  }}
                  className="w-full flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-red-600"></div>
                    <span className="text-sm font-medium text-slate-900">Expired Documents</span>
                  </div>
                  <Badge variant="danger" className="text-xs">
                    {expiredCount}
                  </Badge>
                </button>
              )}
              
              {expiringCount > 0 && (
                <button
                  onClick={() => {
                    setIsOpen(false)
                    // Wait for dialog to close, then scroll
                    setTimeout(() => {
                      if (typeof window !== 'undefined' && (window as any).scrollToExpiringDocuments) {
                        (window as any).scrollToExpiringDocuments()
                      }
                    }, 100)
                  }}
                  className="w-full flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-yellow-600"></div>
                    <span className="text-sm font-medium text-slate-900">Expiring Soon</span>
                  </div>
                  <Badge variant="warning" className="text-xs">
                    {expiringCount}
                  </Badge>
                </button>
              )}
            </div>
            
            {totalAlerts === 0 && (
              <div className="text-center py-4">
                <p className="text-sm text-slate-600">No active compliance alerts</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

