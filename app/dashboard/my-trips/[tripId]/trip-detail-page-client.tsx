'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Calendar, MapPin, User, UserPlus, UserMinus } from 'lucide-react'
import { getTripById, getTripAttendance, getStudents, addStudentToTrip, removeStudentFromTrip } from '@/lib/actions'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { AttendanceMarker } from '@/components/AttendanceMarker'
import { TripConfirmButton } from '@/components/TripConfirmButton'
import { toast } from 'sonner'

interface TripDetailPageClientProps {
  tripId: string
}

export function TripDetailPageClient({ tripId }: TripDetailPageClientProps) {
  const router = useRouter()
  const [trip, setTrip] = useState<any>(null)
  const [attendance, setAttendance] = useState<any[]>([])
  const [allStudents, setAllStudents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddStudent, setShowAddStudent] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState<string>('')

  useEffect(() => {
    loadData()
  }, [tripId])

  const loadData = async () => {
    try {
      setLoading(true)
      const [tripData, attendanceData, studentsData] = await Promise.all([
        getTripById(tripId),
        getTripAttendance(tripId),
        getStudents()
      ])
      
      if (!tripData) {
        toast.error('Trip not found')
        router.push('/dashboard/my-trips')
        return
      }
      
      setTrip(tripData)
      setAttendance(attendanceData)
      setAllStudents(studentsData)
    } catch (error) {
      toast.error('Failed to load trip details')
    } finally {
      setLoading(false)
    }
  }

  const handleAddStudent = async () => {
    if (!selectedStudent) {
      toast.error('Please select a student')
      return
    }

    try {
      await addStudentToTrip(tripId, selectedStudent)
      toast.success('Student added to trip')
      setShowAddStudent(false)
      setSelectedStudent('')
      loadData()
    } catch (error) {
      toast.error('Failed to add student', {
        description: error instanceof Error ? error.message : 'Please try again'
      })
    }
  }

  const handleRemoveStudent = async (studentId: string, studentName: string) => {
    if (!confirm(`Remove ${studentName} from this trip?`)) {
      return
    }

    try {
      await removeStudentFromTrip(tripId, studentId)
      toast.success('Student removed from trip')
      loadData()
    } catch (error) {
      toast.error('Failed to remove student', {
        description: error instanceof Error ? error.message : 'Please try again'
      })
    }
  }

  if (loading) {
    return <div className="text-center py-12">Loading...</div>
  }

  if (!trip) {
    return null
  }

  const attendanceMap = new Map(attendance.map(a => [a.studentId, a]))
  
  const stats = {
    boarded: attendance.filter(a => a.status === 'boarded').length,
    absent: attendance.filter(a => a.status === 'absent').length,
    noShow: attendance.filter(a => a.status === 'no_show').length,
    total: attendance.length
  }

  const studentsNotOnTrip = allStudents.filter(
    s => !attendanceMap.has(s.id) && !s.deletedAt
  )

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
          Back to My Trips
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
              >
                <option value="">Select a student...</option>
                {studentsNotOnTrip.map((student) => (
                  <option key={student.id} value={student.id}>
                    {student.firstName} {student.lastName} {student.grade ? `(Grade ${student.grade})` : ''}
                  </option>
                ))}
              </select>
              <Button onClick={handleAddStudent} size="sm">
                Add
              </Button>
              <Button
                onClick={() => {
                  setShowAddStudent(false)
                  setSelectedStudent('')
                }}
                variant="outline"
                size="sm"
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
              if (!record.student) return null
              
              return (
                <div key={record.id} className="relative">
                  <AttendanceMarker
                    tripId={tripId}
                    student={record.student}
                    currentStatus={record.status}
                    isConfirmed={!!trip.confirmedAt}
                    onStatusChange={loadData}
                  />
                  
                  {!trip.confirmedAt && (
                    <Button
                      onClick={() => handleRemoveStudent(
                        record.studentId,
                        `${record.student.firstName} ${record.student.lastName}`
                      )}
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

      {/* Confirm Trip Button */}
      <TripConfirmButton
        tripId={tripId}
        isConfirmed={!!trip.confirmedAt}
        stats={stats}
        onConfirmed={loadData}
      />
    </div>
  )
}

