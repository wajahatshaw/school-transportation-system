'use client'

import { useState, useTransition } from 'react'
import { Lock, AlertTriangle } from 'lucide-react'
import { confirmTrip } from '@/lib/actions'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'

interface TripConfirmButtonProps {
  tripId: string
  isConfirmed: boolean
  stats: {
    boarded: number
    absent: number
    noShow: number
    total: number
  }
  onConfirmed?: () => void
}

export function TripConfirmButton({
  tripId,
  isConfirmed,
  stats,
  onConfirmed
}: TripConfirmButtonProps) {
  const [showDialog, setShowDialog] = useState(false)
  const [isPending, startTransition] = useTransition()

  const handleConfirm = async () => {
    setShowDialog(false)

    startTransition(async () => {
      try {
        await confirmTrip(tripId)
        toast.success('Trip confirmed', {
          description: 'This trip is now locked and cannot be modified.'
        })
        
        if (onConfirmed) {
          onConfirmed()
        }
      } catch (error) {
        toast.error('Failed to confirm trip', {
          description: error instanceof Error ? error.message : 'Please try again'
        })
      }
    })
  }

  if (isConfirmed) {
    return (
      <div className="flex items-center gap-3 p-4 bg-slate-100 border border-slate-300 rounded-lg">
        <Lock className="h-5 w-5 text-slate-600" />
        <div>
          <div className="text-sm font-medium text-slate-900">
            Trip Confirmed
          </div>
          <div className="text-xs text-slate-600">
            This trip is locked and cannot be modified
          </div>
        </div>
      </div>
    )
  }

  const hasUnaccounted = stats.total > (stats.boarded + stats.absent + stats.noShow)

  return (
    <>
      <div className="bg-white border border-slate-200 rounded-lg p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              Ready to confirm trip?
            </h3>
            
            <div className="grid grid-cols-4 gap-4 mb-4">
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{stats.boarded}</div>
                <div className="text-xs text-green-700">Boarded</div>
              </div>
              <div className="text-center p-3 bg-yellow-50 rounded-lg">
                <div className="text-2xl font-bold text-yellow-600">{stats.absent}</div>
                <div className="text-xs text-yellow-700">Absent</div>
              </div>
              <div className="text-center p-3 bg-red-50 rounded-lg">
                <div className="text-2xl font-bold text-red-600">{stats.noShow}</div>
                <div className="text-xs text-red-700">No Show</div>
              </div>
              <div className="text-center p-3 bg-slate-50 rounded-lg">
                <div className="text-2xl font-bold text-slate-600">{stats.total}</div>
                <div className="text-xs text-slate-700">Total</div>
              </div>
            </div>

            {hasUnaccounted && (
              <div className="flex items-center gap-2 p-3 bg-orange-50 border border-orange-200 rounded-lg mb-4">
                <AlertTriangle className="h-4 w-4 text-orange-600 flex-shrink-0" />
                <div className="text-sm text-orange-800">
                  <strong>{stats.total - (stats.boarded + stats.absent + stats.noShow)} student(s)</strong> have not been accounted for.
                  You can still confirm, but make sure this is correct.
                </div>
              </div>
            )}
            
            <p className="text-sm text-slate-600 mb-4">
              Once confirmed, this trip cannot be modified. All attendance records will be locked.
            </p>
          </div>
          
          <Button
            onClick={() => setShowDialog(true)}
            disabled={isPending}
            size="lg"
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Lock className="h-4 w-4 mr-2" />
            Confirm Trip
          </Button>
        </div>
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent
          onClose={() => setShowDialog(false)}
          className="sm:max-w-[520px]"
        >
          <DialogHeader>
            <DialogTitle>Confirm Trip</DialogTitle>
            <DialogDescription>
              Are you sure you want to confirm this trip? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 space-y-4">
            <div className="p-4 bg-slate-50 rounded-lg">
              <h4 className="font-medium text-slate-900 mb-2">Summary</h4>
              <div className="space-y-1 text-sm text-slate-600">
                <div className="flex justify-between">
                  <span>Boarded:</span>
                  <span className="font-medium text-green-600">{stats.boarded}</span>
                </div>
                <div className="flex justify-between">
                  <span>Absent:</span>
                  <span className="font-medium text-yellow-600">{stats.absent}</span>
                </div>
                <div className="flex justify-between">
                  <span>No Show:</span>
                  <span className="font-medium text-red-600">{stats.noShow}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-slate-200">
                  <span className="font-medium">Total:</span>
                  <span className="font-medium">{stats.total}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0" />
              <div className="text-sm text-red-800">
                <strong>Warning:</strong> Once confirmed, you cannot modify attendance records or add/remove students.
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                onClick={() => setShowDialog(false)}
                variant="outline"
                className="flex-1"
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleConfirm}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
                disabled={isPending}
              >
                {isPending ? 'Confirming...' : 'Yes, Confirm Trip'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

