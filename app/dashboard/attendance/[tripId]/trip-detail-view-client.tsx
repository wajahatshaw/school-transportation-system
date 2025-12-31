'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, Calendar, MapPin, User, Lock, UserPlus, UserMinus, Loader2, Search } from 'lucide-react'
import { getTripById, getTripAttendance, getAuditLogs, getStudents, addStudentToTrip, removeStudentFromTrip } from '@/lib/actions'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { AttendanceMarker } from '@/components/AttendanceMarker'
import { TripConfirmButton } from '@/components/TripConfirmButton'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'

interface TripDetailViewClientProps {
  tripId: string
  role: string
}

export function TripDetailViewClient({ tripId, role }: TripDetailViewClientProps) {
  const router = useRouter()
  const params = useParams()
  const effectiveTripId =
    (typeof tripId === 'string' && tripId) ||
    (typeof (params as any)?.tripId === 'string' ? (params as any).tripId : '') ||
    ''
  const [trip, setTrip] = useState<any>(null)
  const [attendance, setAttendance] = useState<any[]>([])
  const [allStudents, setAllStudents] = useState<any[]>([])
  const [auditLogs, setAuditLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true) // initial load only
  const [isMutating, setIsMutating] = useState(false)
  const [showAudit, setShowAudit] = useState(false)
  const [showAddStudent, setShowAddStudent] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState<string>('')
  const [studentQuery, setStudentQuery] = useState('')
  const [isStudentDropdownOpen, setIsStudentDropdownOpen] = useState(false)
  const isDriver = role === 'driver'

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

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      if (!effectiveTripId) {
        toast.error('Trip not found')
        router.push('/dashboard/attendance')
        return
      }
      const [tripData, attendanceData, logsData] = await Promise.all([
        getTripById(effectiveTripId),
        getTripAttendance(effectiveTripId),
        isDriver ? Promise.resolve([]) : getAuditLogs({ tableName: 'route_trips' })
      ])
      
      if (!tripData) {
        toast.error('Trip not found')
        router.push('/dashboard/attendance')
        return
      }
      
      setTrip(tripData)
      setAttendance(attendanceData)
      // Filter audit logs for this trip
      setAuditLogs((logsData as any[]).filter(log => log.recordId === effectiveTripId))

      // Load students for add-to-trip dropdown (admin only)
      if (!isDriver) {
        const studentsData = await getStudents()
        setAllStudents(studentsData)
      } else {
        setAllStudents([])
      }
    } catch (error) {
      toast.error('Failed to load trip details')
    } finally {
      setLoading(false)
    }
  }, [effectiveTripId, router, isDriver])

  useEffect(() => {
    loadData()
  }, [loadData])

  const upsertAttendance = (studentId: string, status: 'boarded' | 'absent' | 'no_show', markedAt?: string | Date) => {
    setAttendance((prev) =>
      prev.map((r) =>
        r.studentId === studentId
          ? { ...r, status, markedAt: markedAt ? new Date(markedAt) : r.markedAt }
          : r
      )
    )
  }

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'boarded': return 'text-green-600 bg-green-50'
      case 'absent': return 'text-yellow-600 bg-yellow-50'
      case 'no_show': return 'text-red-600 bg-red-50'
      default: return 'text-slate-600 bg-slate-50'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'boarded': return 'Boarded'
      case 'absent': return 'Absent'
      case 'no_show': return 'No Show'
      default: return status
    }
  }

  // (moved above to keep hook order stable + optimize)

  const isReadOnlyForDriver = isDriver && !!trip.confirmedAt

  const handleAddStudent = async () => {
    if (!selectedStudent) {
      toast.error('Please select a student')
      return
    }

    try {
      setIsMutating(true)
      const created = await addStudentToTrip(effectiveTripId, selectedStudent)
      toast.success('Student added to trip')
      setShowAddStudent(false)
      setSelectedStudent('')
      setStudentQuery('')
      setIsStudentDropdownOpen(false)
      // Avoid full reload: just append record (if server returned student) otherwise refetch attendance only
      if ((created as any)?.student) {
        setAttendance((prev) => [...prev, created])
      } else {
        const attendanceData = await getTripAttendance(effectiveTripId)
        setAttendance(attendanceData)
      }
    } catch (error) {
      toast.error('Failed to add student', {
        description: error instanceof Error ? error.message : 'Please try again'
      })
    } finally {
      setIsMutating(false)
    }
  }

  const handleRemoveStudent = async (studentId: string, studentName: string) => {
    if (!confirm(`Remove ${studentName} from this trip?`)) {
      return
    }

    try {
      setIsMutating(true)
      await removeStudentFromTrip(effectiveTripId, studentId)
      toast.success('Student removed from trip')
      setAttendance((prev) => prev.filter((r) => r.studentId !== studentId))
    } catch (error) {
      toast.error('Failed to remove student', {
        description: error instanceof Error ? error.message : 'Please try again'
      })
    } finally {
      setIsMutating(false)
    }
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
                <span>{new Date(trip.tripDate).toLocaleDateString()}</span>
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
                          const sub = student.grade ? `Grade ${student.grade}` : 'No grade'
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
                    currentStatus={record.status}
                    isConfirmed={!!trip.confirmedAt}
                    isReadOnly={isReadOnlyForDriver}
                    onStatusChange={({ studentId, status, markedAt }) => upsertAttendance(studentId, status, markedAt)}
                  />

                  {!isDriver && !trip.confirmedAt && (
                    <Button
                      onClick={() =>
                        handleRemoveStudent(
                          record.studentId,
                          `${record.student.firstName} ${record.student.lastName}`
                        )
                      }
                      variant="ghost"
                      size="sm"
                      className="absolute top-2 right-2 text-red-600 hover:text-red-700 hover:bg-red-50"
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
        onConfirmed={async () => {
          // Avoid full reload: update local trip state
          setTrip((prev: any) => (prev ? { ...prev, confirmedAt: new Date().toISOString() } : prev))
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

