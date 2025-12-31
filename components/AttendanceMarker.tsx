'use client'

import { useState, useTransition } from 'react'
import { CheckCircle2, XCircle, MinusCircle } from 'lucide-react'
import { markAttendance } from '@/lib/actions'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

type AttendanceStatus = 'boarded' | 'absent' | 'no_show' | null

interface Student {
  id: string
  firstName: string
  lastName: string
  grade?: string | null
}

interface AttendanceMarkerProps {
  tripId: string
  student: Student
  currentStatus: AttendanceStatus
  isConfirmed: boolean
  isReadOnly?: boolean
  onStatusChange?: (updated: { studentId: string; status: 'boarded' | 'absent' | 'no_show'; markedAt?: string | Date }) => void
}

export function AttendanceMarker({
  tripId,
  student,
  currentStatus,
  isConfirmed,
  isReadOnly = false,
  onStatusChange
}: AttendanceMarkerProps) {
  const [isPending, startTransition] = useTransition()
  const [localStatus, setLocalStatus] = useState<AttendanceStatus>(currentStatus)

  const handleStatusChange = async (status: 'boarded' | 'absent' | 'no_show') => {
    if (isConfirmed) {
      toast.error('Cannot modify confirmed trip')
      return
    }
    if (isReadOnly) {
      toast.error('This trip is read-only', {
        description: 'This trip is locked.'
      })
      return
    }

    setLocalStatus(status)

    startTransition(async () => {
      try {
        const updated = await markAttendance(tripId, student.id, status)
        toast.success('Attendance marked', {
          description: `${student.firstName} ${student.lastName} marked as ${status.replace('_', ' ')}`
        })
        
        if (onStatusChange) {
          onStatusChange({
            studentId: student.id,
            status,
            markedAt: (updated as any)?.markedAt
          })
        }
      } catch (error) {
        setLocalStatus(currentStatus)
        toast.error('Failed to mark attendance', {
          description: error instanceof Error ? error.message : 'Please try again'
        })
      }
    })
  }

  const getStatusBadge = () => {
    if (!localStatus) return null
    
    const variants = {
      boarded: 'success' as const,
      absent: 'warning' as const,
      no_show: 'danger' as const
    }
    
    const labels = {
      boarded: 'Boarded',
      absent: 'Absent',
      no_show: 'No Show'
    }
    
    return (
      <Badge variant={variants[localStatus]}>
        {labels[localStatus]}
      </Badge>
    )
  }

  return (
    <div className="flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
      <div className="flex items-center gap-4 flex-1">
        <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold text-sm">
          {student.firstName[0]}{student.lastName[0]}
        </div>
        <div className="flex-1">
          <div className="text-sm font-medium text-slate-900">
            {student.firstName} {student.lastName}
          </div>
          {student.grade && (
            <div className="text-xs text-slate-500">
              Grade {student.grade}
            </div>
          )}
        </div>
        <div className="min-w-[100px]">
          {getStatusBadge()}
        </div>
      </div>
      
      <div className="flex gap-2 ml-4">
        <Button
          onClick={() => handleStatusChange('boarded')}
          disabled={isPending || isConfirmed || isReadOnly}
          size="sm"
          variant={localStatus === 'boarded' ? 'default' : 'outline'}
          className={localStatus === 'boarded' ? 'bg-green-600 hover:bg-green-700' : 'hover:bg-green-50 hover:text-green-600'}
        >
          <CheckCircle2 className="h-4 w-4 mr-1" />
          Boarded
        </Button>
        
        <Button
          onClick={() => handleStatusChange('absent')}
          disabled={isPending || isConfirmed || isReadOnly}
          size="sm"
          variant={localStatus === 'absent' ? 'default' : 'outline'}
          className={localStatus === 'absent' ? 'bg-yellow-600 hover:bg-yellow-700' : 'hover:bg-yellow-50 hover:text-yellow-600'}
        >
          <MinusCircle className="h-4 w-4 mr-1" />
          Absent
        </Button>
        
        <Button
          onClick={() => handleStatusChange('no_show')}
          disabled={isPending || isConfirmed || isReadOnly}
          size="sm"
          variant={localStatus === 'no_show' ? 'default' : 'outline'}
          className={localStatus === 'no_show' ? 'bg-red-600 hover:bg-red-700' : 'hover:bg-red-50 hover:text-red-600'}
        >
          <XCircle className="h-4 w-4 mr-1" />
          No Show
        </Button>
      </div>
    </div>
  )
}

