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
  disabled?: boolean
  disabledReason?: string
  onConfirmed?: () => void
}

export function TripConfirmButton({
  tripId,
  isConfirmed,
  stats,
  disabled = false,
  disabledReason,
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
  const isDisabled = disabled || isPending
  const showNoBoarded = stats.boarded === 0

  return (
    <>
      <div className="bg-white border border-slate-200 rounded-lg p-6">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Confirm trip</h3>
                <p className="text-sm text-slate-600">
                  Once confirmed, this trip is locked and cannot be modified.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-700">{stats.boarded}</div>
                <div className="text-xs text-green-800">Boarded</div>
              </div>
              <div className="text-center p-3 bg-yellow-50 rounded-lg">
                <div className="text-2xl font-bold text-yellow-700">{stats.absent}</div>
                <div className="text-xs text-yellow-800">Absent</div>
              </div>
              <div className="text-center p-3 bg-red-50 rounded-lg">
                <div className="text-2xl font-bold text-red-700">{stats.noShow}</div>
                <div className="text-xs text-red-800">No Show</div>
              </div>
              <div className="text-center p-3 bg-slate-50 rounded-lg">
                <div className="text-2xl font-bold text-slate-700">{stats.total}</div>
                <div className="text-xs text-slate-700">Total</div>
              </div>
        </div>

            {hasUnaccounted && (
              <div className="flex items-center gap-2 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                <AlertTriangle className="h-4 w-4 text-orange-600 flex-shrink-0" />
                <div className="text-sm text-orange-800">
                  <strong>{stats.total - (stats.boarded + stats.absent + stats.noShow)} student(s)</strong> have not been accounted for yet.
                </div>
              </div>
            )}

            {(showNoBoarded || disabledReason) && (
              <div className="flex items-center gap-2 p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700">
                <Lock className="h-4 w-4 text-slate-600 flex-shrink-0" />
                <div>
                  {disabledReason || (showNoBoarded ? 'At least 1 student must be boarded to confirm.' : '')}
                </div>
          </div>
        )}

        <div className="flex justify-end">
          <Button
            onClick={() => setShowDialog(true)}
            disabled={isDisabled}
            size="lg"
            className="w-full sm:w-auto bg-slate-900 hover:bg-slate-800"
          >
            <Lock className="h-4 w-4 mr-2" />
            Confirm Trip
          </Button>
        </div>
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
                className="flex-1 bg-slate-900 hover:bg-slate-800"
                disabled={isDisabled}
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

