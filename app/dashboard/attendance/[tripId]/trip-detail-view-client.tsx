'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, Calendar, MapPin, User, Lock, UserPlus, UserMinus, Loader2, Search } from 'lucide-react'
import { getTripById, getTripAttendance, getAuditLogs, getStudents, addStudentToTrip, removeStudentFromTrip } from '@/lib/actions'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { AttendanceMarker } from '@/components/AttendanceMarker'
import { TripConfirmButton } from '@/components/TripConfirmButton'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
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

interface AuditLog {
  id: string
  recordId: string
  action: string
  userId: string
  createdAt: string | Date
}

interface TripDetailViewClientProps {
  tripId: string
  role: string
}

export function TripDetailViewClient({ tripId, role }: TripDetailViewClientProps) {
  const router = useRouter()
  const params = useParams<{ tripId?: string | string[] }>()
  const queryClient = useQueryClient()
  const paramTripId = Array.isArray(params?.tripId) ? params?.tripId?.[0] : params?.tripId
  const effectiveTripId = (typeof tripId === 'string' && tripId) || (typeof paramTripId === 'string' ? paramTripId : '') || ''
  const tripNotFoundHandledRef = useRef(false)
  const [attendanceMutations, setAttendanceMutations] = useState(0)
  const [showAudit, setShowAudit] = useState(false)
  const [showAddStudent, setShowAddStudent] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState<string>('')
  const [studentQuery, setStudentQuery] = useState('')
  const [isStudentDropdownOpen, setIsStudentDropdownOpen] = useState(false)
  const isDriver = role === 'driver'

  const tripQuery = useQuery<Trip | null>({
    queryKey: queryKeys.trip(effectiveTripId),
    queryFn: async () => (await getTripById(effectiveTripId)) as unknown as Trip | null,
    enabled: !!effectiveTripId,
    placeholderData: (previousData) => previousData, // Show cached data immediately
  })

  const attendanceQuery = useQuery<AttendanceRecord[]>({
    queryKey: queryKeys.tripAttendance(effectiveTripId),
    queryFn: async () => (await getTripAttendance(effectiveTripId)) as unknown as AttendanceRecord[],
    enabled: !!effectiveTripId,
    placeholderData: (previousData) => previousData, // Show cached data immediately
  })

  const auditLogsQuery = useQuery<AuditLog[]>({
    queryKey: queryKeys.auditLogs({ tableName: 'route_trips' }),
    queryFn: async () => {
      const logs = await getAuditLogs({ tableName: 'route_trips' })
      return logs.filter((log) => (log as AuditLog).recordId === effectiveTripId) as AuditLog[]
    },
    enabled: !isDriver,
    placeholderData: (previousData) => previousData, // Show cached data immediately
  })

  const studentsQuery = useQuery<Student[]>({
    queryKey: queryKeys.students(),
    queryFn: async () => (await getStudents()) as unknown as Student[],
    enabled: !isDriver,
    placeholderData: (previousData) => previousData, // Show cached data immediately
  })

  useEffect(() => {
    if (tripNotFoundHandledRef.current) return
    if (!effectiveTripId) return
    if (!tripQuery.isSuccess) return
    if (tripQuery.data) return

    tripNotFoundHandledRef.current = true
    toast.error('Trip not found')
    router.push('/dashboard/attendance')
  }, [effectiveTripId, router, tripQuery.data, tripQuery.isSuccess])

  const trip = tripQuery.data
  const attendance = useMemo(() => attendanceQuery.data ?? [], [attendanceQuery.data])
  const allStudents = useMemo(() => studentsQuery.data ?? [], [studentsQuery.data])
  const auditLogs = useMemo(() => {
    const logs = auditLogsQuery.data ?? []
    return logs.filter((log) => log.recordId === effectiveTripId)
  }, [auditLogsQuery.data, effectiveTripId])

  // Derived data (must be declared BEFORE any early returns to keep hook order stable)
  const attendanceStudentIdSet = useMemo(() => {
    return new Set(attendance.map((a) => a.studentId))
  }, [attendance])

  const studentsNotOnTrip = useMemo(() => {
    return allStudents.filter((s) => !attendanceStudentIdSet.has(s.id) && !s.deletedAt)
  }, [allStudents, attendanceStudentIdSet])

  const filteredStudents = useMemo(() => {
    const q = studentQuery.trim().toLowerCase()
    if (!q) return studentsNotOnTrip
    return studentsNotOnTrip.filter((s) => {
      const full = `${s.firstName} ${s.lastName}`.toLowerCase()
      const grade = (s.grade || '').toString().toLowerCase()
      return full.includes(q) || grade.includes(q)
    })
  }, [studentsNotOnTrip, studentQuery])

  const upsertAttendance = (studentId: string, status: 'boarded' | 'absent' | 'no_show', markedAt?: string | Date) => {
    queryClient.setQueryData<AttendanceRecord[] | undefined>(queryKeys.tripAttendance(effectiveTripId), (prev) => {
      if (!prev) return prev
      return prev.map((r) =>
        r.studentId === studentId
          ? { ...r, status, markedAt: markedAt ? new Date(markedAt) : r.markedAt }
          : r
      )
    })
  }

  const addStudentMutation = useMutation({
    mutationFn: async (studentId: string) => addStudentToTrip(effectiveTripId, studentId),
    onSuccess: (created) => {
      toast.success('Student added to trip')
      setShowAddStudent(false)
      setSelectedStudent('')
      setStudentQuery('')
      setIsStudentDropdownOpen(false)
      queryClient.setQueryData<AttendanceRecord[] | undefined>(queryKeys.tripAttendance(effectiveTripId), (prev) => {
        if (!prev) return prev
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
    mutationFn: async (studentId: string) => removeStudentFromTrip(effectiveTripId, studentId),
    onSuccess: (_res, studentId) => {
      toast.success('Student removed from trip')
      queryClient.setQueryData<AttendanceRecord[] | undefined>(queryKeys.tripAttendance(effectiveTripId), (prev) => {
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

  const isMutating = addStudentMutation.isPending || removeStudentMutation.isPending

  // Only show loading skeleton when there's NO cached data yet (first load).
  // If cache exists, render immediately with cached data.
  const loading =
    (tripQuery.isPending && !tripQuery.data) ||
    (attendanceQuery.isPending && !attendanceQuery.data) ||
    (!isDriver && ((studentsQuery.isPending && !studentsQuery.data) || (auditLogsQuery.isPending && !auditLogsQuery.data)))

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-9 w-40" />
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
          <Skeleton className="h-7 w-64" />
          <div className="flex gap-4">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-40" />
          </div>
        </div>
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white border border-slate-200 rounded-lg p-4">
              <Skeleton className="h-8 w-10 mb-2" />
              <Skeleton className="h-4 w-24" />
            </div>
          ))}
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-3">
          <Skeleton className="h-6 w-40" />
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </div>
    )
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

  // (moved above to keep hook order stable + optimize)

  const isReadOnlyForDriver = isDriver && !!trip.confirmedAt

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/dashboard/attendance')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Attendance
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
                <span>{new Date(trip.tripDate).toLocaleDateString(undefined, { timeZone: 'UTC' })}</span>
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
          <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg text-sm text-slate-600">
            <Lock className="h-4 w-4" />
            <span>Confirmed on {new Date(trip.confirmedAt).toLocaleString()}</span>
          </div>
        )}
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-green-600">{stats.boarded}</div>
          <div className="text-sm text-slate-600">Boarded</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-yellow-600">{stats.absent}</div>
          <div className="text-sm text-slate-600">Absent</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-red-600">{stats.noShow}</div>
          <div className="text-sm text-slate-600">No Show</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-slate-900">{stats.total}</div>
          <div className="text-sm text-slate-600">Total Students</div>
        </div>
      </div>

      {/* Add/Remove Student (admin only, only before confirmation) */}
      {!isDriver && !trip.confirmedAt && (
        <div className="bg-white border border-slate-200 rounded-lg p-5">
          {!showAddStudent ? (
            <Button
              onClick={() => setShowAddStudent(true)}
              variant="outline"
              size="sm"
              className="gap-2"
            >
              <UserPlus className="h-4 w-4" />
              Add Student to Trip
            </Button>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-slate-900">Add a student</div>
                  <div className="text-xs text-slate-500">
                    Search and select from {studentsNotOnTrip.length} available student(s).
                  </div>
                </div>
                {isMutating && (
                  <div className="text-xs text-slate-500 flex items-center gap-2">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Updating…
                  </div>
                )}
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  value={studentQuery}
                  onChange={(e) => {
                    setStudentQuery(e.target.value)
                    setIsStudentDropdownOpen(true)
                    setSelectedStudent('')
                  }}
                  onFocus={() => setIsStudentDropdownOpen(true)}
                  onBlur={() => {
                    // allow click selection
                    setTimeout(() => setIsStudentDropdownOpen(false), 120)
                  }}
                  placeholder="Search student by name or grade…"
                  className="pl-10"
                  disabled={isMutating}
                />

                {isStudentDropdownOpen && (
                  <div className="absolute z-20 mt-2 w-full rounded-lg border border-slate-200 bg-white shadow-lg overflow-hidden">
                    <div className="max-h-64 overflow-auto">
                      {filteredStudents.length === 0 ? (
                        <div className="px-4 py-3 text-sm text-slate-600">
                          No students match “{studentQuery}”.
                        </div>
                      ) : (
                        filteredStudents.slice(0, 50).map((student) => {
                          const label = `${student.firstName} ${student.lastName}`
                          const sub = student.grade ? formatGradeLabel(student.grade) : 'No grade'
                          const active = selectedStudent === student.id
                          return (
                            <button
                              key={student.id}
                              type="button"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => {
                                setSelectedStudent(student.id)
                                setStudentQuery(label)
                                setIsStudentDropdownOpen(false)
                              }}
                              className={`w-full text-left px-4 py-3 transition-colors ${
                                active ? 'bg-blue-50' : 'hover:bg-slate-50'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="text-sm font-medium text-slate-900">{label}</div>
                                {student.grade && (
                                  <span className="text-xs rounded-full bg-slate-100 px-2 py-0.5 text-slate-700">
                                    {sub}
                                  </span>
                                )}
                              </div>
                              {!student.grade && (
                                <div className="text-xs text-slate-500 mt-0.5">{sub}</div>
                              )}
                            </button>
                          )
                        })
                      )}
                    </div>
                    {filteredStudents.length > 50 && (
                      <div className="px-4 py-2 text-xs text-slate-500 border-t border-slate-200 bg-slate-50">
                        Showing first 50 results. Refine your search to narrow down.
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleAddStudent}
                  size="sm"
                  disabled={isMutating || !selectedStudent}
                  className="min-w-[110px]"
                >
                  {isMutating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Adding…
                    </>
                  ) : (
                    'Add'
                  )}
                </Button>
                <Button
                  onClick={() => {
                    setShowAddStudent(false)
                    setSelectedStudent('')
                    setStudentQuery('')
                    setIsStudentDropdownOpen(false)
                  }}
                  variant="outline"
                  size="sm"
                  disabled={isMutating}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Attendance Execution UI */}
      <div className="bg-white border border-slate-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-slate-900">
            Students ({attendance.length})
          </h2>
        </div>

        {isReadOnlyForDriver && (
          <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
            This trip is confirmed and locked. Attendance cannot be updated.
          </div>
        )}

        {attendance.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            No students on this trip yet. Add students to begin marking attendance.
          </div>
        ) : (
          <div className="space-y-3">
            {attendance.map((record) => {
              if (!record.student) return null

              return (
                <div key={record.id} className="relative">
                  <AttendanceMarker
                    tripId={effectiveTripId}
                    student={record.student}
                    currentStatus={record.status as AttendanceStatus}
                    isConfirmed={!!trip.confirmedAt}
                    isReadOnly={isReadOnlyForDriver}
                    onStatusChange={({ studentId, status, markedAt }) => upsertAttendance(studentId, status, markedAt)}
                    onMutationStart={() => setAttendanceMutations((c) => c + 1)}
                    onMutationEnd={() => setAttendanceMutations((c) => Math.max(0, c - 1))}
                  />

                  {!isDriver && !trip.confirmedAt && record.student && (
                    <Button
                      onClick={() =>
                        handleRemoveStudent(
                          record.studentId,
                          `${record.student!.firstName} ${record.student!.lastName}`
                        )
                      }
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

      {/* Confirm Trip */}
      <TripConfirmButton
        tripId={effectiveTripId}
        isConfirmed={!!trip.confirmedAt}
        stats={stats}
        disabled={attendanceMutations > 0 || isMutating || stats.boarded === 0}
        disabledReason={
          attendanceMutations > 0 || isMutating
            ? 'Please wait for changes to finish saving.'
            : stats.boarded === 0
              ? 'At least 1 student must be boarded to confirm.'
              : undefined
        }
        onConfirmed={() => {
          queryClient.setQueryData<Trip | null | undefined>(queryKeys.trip(effectiveTripId), (prev) =>
            prev ? { ...prev, confirmedAt: new Date().toISOString() } : prev
          )
        }}
      />

      {/* Audit Log */}
      {!isDriver && auditLogs.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-slate-900">
              Audit Trail
            </h2>
            <Button
              onClick={() => setShowAudit(!showAudit)}
              variant="outline"
              size="sm"
            >
              {showAudit ? 'Hide' : 'Show'} Audit Log
            </Button>
          </div>

          {showAudit && (
            <div className="space-y-2">
              {auditLogs.map((log) => (
                <div key={log.id} className="border border-slate-200 rounded p-3 text-sm">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-slate-900">{log.action}</span>
                    <span className="text-slate-500">
                      {new Date(log.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <div className="text-slate-600 text-xs">
                    User ID: {log.userId}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function formatGradeLabel(grade: string) {
  const g = grade.trim()
  if (!g) return ''
  if (/^grade\b/i.test(g)) return g
  return `Grade ${g}`
}

