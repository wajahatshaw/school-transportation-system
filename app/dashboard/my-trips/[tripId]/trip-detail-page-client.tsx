'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Calendar, MapPin, User, UserPlus, UserMinus } from 'lucide-react'
import { getTripById, getTripAttendance, getStudents, addStudentToTrip, removeStudentFromTrip } from '@/lib/actions'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { AttendanceMarker } from '@/components/AttendanceMarker'
import { TripConfirmButton } from '@/components/TripConfirmButton'
import { toast } from 'sonner'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/react-query/keys'

type AttendanceStatus = 'boarded' | 'absent' | 'no_show'

interface Student {
  id: string
  firstName: string
  lastName: string
  grade?: string | null
  deletedAt?: string | Date | null
}

interface AttendanceRecord {
  id: string
  studentId: string
  status: AttendanceStatus
  markedAt?: string | Date
  student: Student | null
}

interface Trip {
  id: string
  tripDate: string | Date
  routeType: string
  confirmedAt: string | Date | null
  route?: { name?: string | null } | null
  driver?: { firstName: string; lastName: string } | null
}

interface TripDetailPageClientProps {
  tripId: string
}

export function TripDetailPageClient({ tripId }: TripDetailPageClientProps) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const tripNotFoundHandledRef = useRef(false)
  const [showAddStudent, setShowAddStudent] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState<string>('')

  const tripQuery = useQuery<Trip | null>({
    queryKey: queryKeys.trip(tripId),
    queryFn: async () => (await getTripById(tripId)) as unknown as Trip | null,
    enabled: !!tripId,
    placeholderData: (previousData) => previousData, // Show cached data immediately
  })

  const attendanceQuery = useQuery<AttendanceRecord[]>({
    queryKey: queryKeys.tripAttendance(tripId),
    queryFn: async () => (await getTripAttendance(tripId)) as unknown as AttendanceRecord[],
    enabled: !!tripId,
    placeholderData: (previousData) => previousData, // Show cached data immediately
  })

  const studentsQuery = useQuery<Student[]>({
    queryKey: queryKeys.students(),
    queryFn: async () => (await getStudents()) as unknown as Student[],
    placeholderData: (previousData) => previousData, // Show cached data immediately
  })

  useEffect(() => {
    if (tripNotFoundHandledRef.current) return
    if (!tripQuery.isSuccess) return
    if (tripQuery.data) return

    tripNotFoundHandledRef.current = true
        toast.error('Trip not found')
        router.push('/dashboard/my-trips')
  }, [router, tripQuery.data, tripQuery.isSuccess])

  const addStudentMutation = useMutation({
    mutationFn: async (studentId: string) => addStudentToTrip(tripId, studentId),
    onSuccess: (created) => {
      toast.success('Student added to trip')
      setShowAddStudent(false)
      setSelectedStudent('')
      queryClient.setQueryData<AttendanceRecord[] | undefined>(queryKeys.tripAttendance(tripId), (prev) => {
        if (!prev) return prev
        // Server action returns AttendanceRecord with student included.
        return [...prev, created as unknown as AttendanceRecord]
      })
    },
    onError: (error) => {
      toast.error('Failed to add student', {
        description: error instanceof Error ? error.message : 'Please try again',
      })
    },
  })

  const removeStudentMutation = useMutation({
    mutationFn: async (studentId: string) => removeStudentFromTrip(tripId, studentId),
    onSuccess: (_res, studentId) => {
      toast.success('Student removed from trip')
      queryClient.setQueryData<AttendanceRecord[] | undefined>(queryKeys.tripAttendance(tripId), (prev) => {
        if (!prev) return prev
        return prev.filter((r) => r.studentId !== studentId)
      })
    },
    onError: (error) => {
      toast.error('Failed to remove student', {
        description: error instanceof Error ? error.message : 'Please try again',
      })
    },
  })

  const handleAddStudent = async () => {
    if (!selectedStudent) {
      toast.error('Please select a student')
      return
    }

    addStudentMutation.mutate(selectedStudent)
  }

  const handleRemoveStudent = async (studentId: string, studentName: string) => {
    if (!confirm(`Remove ${studentName} from this trip?`)) {
      return
    }

    removeStudentMutation.mutate(studentId)
  }

  // Only show loading when there's NO cached data yet (first load).
  // If cache exists, render immediately with cached data.
  const loading =
    (tripQuery.isPending && !tripQuery.data) ||
    (attendanceQuery.isPending && !attendanceQuery.data) ||
    (studentsQuery.isPending && !studentsQuery.data)

  const trip = tripQuery.data
  const attendance = useMemo(() => attendanceQuery.data ?? [], [attendanceQuery.data])
  const allStudents = useMemo(() => studentsQuery.data ?? [], [studentsQuery.data])
  const attendanceMap = useMemo(() => new Map(attendance.map((a) => [a.studentId, a])), [attendance])
  const studentsNotOnTrip = useMemo(
    () => allStudents.filter((s) => !attendanceMap.has(s.id) && !s.deletedAt),
    [allStudents, attendanceMap]
  )

  if (loading) {
    return <div className="text-center py-12">Loading...</div>
  }

  if (!trip) {
    return null
  }
  
  const stats = {
    boarded: attendance.filter(a => a.status === 'boarded').length,
    absent: attendance.filter(a => a.status === 'absent').length,
    noShow: attendance.filter(a => a.status === 'no_show').length,
    total: attendance.length
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/dashboard/my-trips')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Trips
        </Button>
      </div>

      {/* Trip Info Card */}
      <div className="bg-white border border-slate-200 rounded-lg p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">
              {trip.route?.name || 'Unknown Route'}
            </h1>
            <div className="flex items-center gap-4 text-sm text-slate-600">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span>{formatDateUtc(trip.tripDate)}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                <span>{trip.routeType} Route</span>
              </div>
              {trip.driver && (
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  <span>{trip.driver.firstName} {trip.driver.lastName}</span>
                </div>
              )}
            </div>
          </div>
          
          {trip.confirmedAt ? (
            <Badge variant="success">Confirmed</Badge>
          ) : (
            <Badge variant="default">In Progress</Badge>
          )}
        </div>

        {trip.confirmedAt && (
          <div className="p-3 bg-slate-50 rounded-lg text-sm text-slate-600">
            Confirmed on {new Date(trip.confirmedAt).toLocaleString()}
          </div>
        )}
      </div>

      {/* Add Student Section */}
      {!trip.confirmedAt && (
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          {!showAddStudent ? (
            <Button
              onClick={() => setShowAddStudent(true)}
              variant="outline"
              size="sm"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Add Student to Trip
            </Button>
          ) : (
            <div className="flex gap-2">
              <select
                value={selectedStudent}
                onChange={(e) => setSelectedStudent(e.target.value)}
                className="flex-1 px-3 py-2 border border-slate-300 rounded-md text-sm"
                disabled={addStudentMutation.isPending}
              >
                <option value="">Select a student...</option>
                {studentsNotOnTrip.map((student) => (
                  <option key={student.id} value={student.id}>
                    {student.firstName} {student.lastName} {student.grade ? `(Grade ${student.grade})` : ''}
                  </option>
                ))}
              </select>
              <Button onClick={handleAddStudent} size="sm" disabled={addStudentMutation.isPending || !selectedStudent}>
                Add
              </Button>
              <Button
                onClick={() => {
                  setShowAddStudent(false)
                  setSelectedStudent('')
                }}
                variant="outline"
                size="sm"
                disabled={addStudentMutation.isPending}
              >
                Cancel
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Attendance List */}
      <div className="bg-white border border-slate-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-slate-900">
            Student Attendance ({attendance.length})
          </h2>
        </div>

        {attendance.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            No students on this trip yet. Add students to begin marking attendance.
          </div>
        ) : (
          <div className="space-y-3">
            {attendance.map((record) => {
              const student = record.student
              if (!student) return null
              
              return (
                <div key={record.id} className="relative">
                  <AttendanceMarker
                    tripId={tripId}
                    student={student}
                    currentStatus={record.status as AttendanceStatus}
                    isConfirmed={!!trip.confirmedAt}
                    onStatusChange={({ studentId, status, markedAt }) => {
                      queryClient.setQueryData<AttendanceRecord[] | undefined>(queryKeys.tripAttendance(tripId), (prev) => {
                        if (!prev) return prev
                        return prev.map((r) =>
                          r.studentId === studentId
                            ? { ...r, status, markedAt: markedAt ? new Date(markedAt) : r.markedAt }
                            : r
                        )
                      })
                    }}
                  />
                  
                  {!trip.confirmedAt && (
                    <Button
                      onClick={() => handleRemoveStudent(
                        record.studentId,
                        `${student.firstName} ${student.lastName}`
                      )}
                      variant="ghost"
                      size="sm"
                      className="absolute top-2 right-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                      disabled={removeStudentMutation.isPending}
                    >
                      <UserMinus className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Confirm Trip Button */}
      <TripConfirmButton
        tripId={tripId}
        isConfirmed={!!trip.confirmedAt}
        stats={stats}
        disabled={addStudentMutation.isPending || removeStudentMutation.isPending}
        disabledReason={
          addStudentMutation.isPending || removeStudentMutation.isPending ? 'Please wait for changes to finish saving.' : undefined
        }
        onConfirmed={() => {
          queryClient.setQueryData<Trip | null | undefined>(queryKeys.trip(tripId), (prev) =>
            prev ? { ...prev, confirmedAt: new Date().toISOString() } : prev
          )
        }}
      />
    </div>
  )
}

function formatDateUtc(dateLike: string | number | Date) {
  return new Date(dateLike).toLocaleDateString(undefined, { timeZone: 'UTC' })
}

