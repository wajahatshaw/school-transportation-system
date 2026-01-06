'use client'

import { useState, useTransition } from 'react'
import { Driver, Student, Vehicle } from '@prisma/client'
import { Pencil, Trash2 } from 'lucide-react'
import { updateStudent, softDeleteStudent } from '@/lib/actions'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { EditStudentModal } from './EditStudentModal'
import { DeleteConfirmDialog } from './DeleteConfirmDialog'
import { formatTimeLabel } from '@/lib/time'
import { formatUsPhoneInput } from '@/lib/phone'

interface StudentsTableProps {
  students: Student[]
  drivers: Driver[]
  vehicles: Vehicle[]
  onUpdate?: () => void
}

export function StudentsTable({ students, drivers, vehicles, onUpdate }: StudentsTableProps) {
  const [editingStudent, setEditingStudent] = useState<Student | null>(null)
  const [deletingStudent, setDeletingStudent] = useState<Student | null>(null)
  const [isPending, startTransition] = useTransition()

  const driversById = new Map(drivers.map((d) => [d.id, d]))
  const vehiclesById = new Map(vehicles.map((v) => [v.id, v]))

  const handleEdit = (student: Student) => {
    setEditingStudent(student)
  }

  const handleUpdate = async (data: {
    firstName: string
    lastName: string
    grade?: string
    studentAddress?: string | null
    morningPickupTime?: string | null
    guardianName?: string | null
    guardianPhone?: string | null
    schoolName?: string | null
    schoolAddress?: string | null
    schoolPhone?: string | null
  }) => {
    if (!editingStudent) return

    setEditingStudent(null)

    startTransition(async () => {
      try {
        await updateStudent(editingStudent.id, data)
        toast.success('Student updated successfully', {
          description: `${data.firstName} ${data.lastName}'s information has been updated.`
        })
        
        // Refresh the data
        if (onUpdate) {
          onUpdate()
        }
      } catch (error) {
        toast.error('Failed to update student', {
          description: 'Please try again or contact support if the problem persists.'
        })
      }
    })
  }

  const handleDelete = async () => {
    if (!deletingStudent) return

    const deletedStudent = deletingStudent
    setDeletingStudent(null)

    startTransition(async () => {
      try {
        await softDeleteStudent(deletedStudent.id)
        toast.success('Student deleted successfully', {
          description: `${deletedStudent.firstName} ${deletedStudent.lastName} has been removed.`
        })
        
        // Refresh the data
        if (onUpdate) {
          onUpdate()
        }
      } catch (error) {
        toast.error('Failed to delete student', {
          description: 'Please try again or contact support if the problem persists.'
        })
      }
    })
  }

  if (students.length === 0) {
    return (
      <EmptyState
        icon={<div className="text-6xl">👨‍🎓</div>}
        title="No students yet"
        description="Get started by adding your first student to the system."
      />
    )
  }

  return (
    <>
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-[1700px] w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Serial #
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Run ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Student Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Grade
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Home Address
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Parent Phone
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Morning Pickup
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Afternoon Pickup
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Afternoon Drop
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  School Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  School Address
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  School Phone
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Bus Number
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Driver
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider w-[220px]">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {students.map((student) => (
                <tr
                  key={student.id}
                  className="transition-all duration-200 hover:bg-slate-50"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-slate-900">{student.serialNo || '—'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-slate-900">{student.runId || '—'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-slate-900">
                      {student.firstName} {student.lastName}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-slate-500">{student.grade || 'N/A'}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div
                      className="text-sm text-slate-700 max-w-[260px] truncate"
                      title={student.studentAddress ?? ''}
                    >
                      {student.studentAddress || '—'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-slate-700">
                      {student.guardianPhone ? formatUsPhoneInput(student.guardianPhone).display : '—'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-slate-700">
                      {student.morningPickupTime ? formatTimeLabel(student.morningPickupTime) : '—'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-slate-700">
                      {student.afternoonPickupTime ? formatTimeLabel(student.afternoonPickupTime) : '—'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-slate-700">
                      {student.afternoonDropTime ? formatTimeLabel(student.afternoonDropTime) : '—'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-slate-700">{student.schoolName || '—'}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div
                      className="text-sm text-slate-700 max-w-[260px] truncate"
                      title={student.schoolAddress ?? ''}
                    >
                      {student.schoolAddress || '—'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-slate-700">
                      {student.schoolPhone ? formatUsPhoneInput(student.schoolPhone).display : '—'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {(() => {
                      const v = student.vehicleId ? vehiclesById.get(student.vehicleId) : undefined
                      return (
                        <div className="text-sm text-slate-700">
                          {v?.licensePlate || '—'}
                        </div>
                      )
                    })()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {(() => {
                      const d = student.driverId ? driversById.get(student.driverId) : undefined
                      return (
                        <div className="text-sm text-slate-700">
                          {d?.firstName || '—'}
                        </div>
                      )
                    })()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge variant={student.deletedAt ? 'danger' : 'success'}>
                      {student.deletedAt ? 'Deleted' : 'Active'}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium w-[220px]">
                    <div className="flex items-center justify-center gap-3">
                      <Button
                        onClick={() => handleEdit(student)}
                        variant="ghost"
                        size="sm"
                        className="text-slate-700"
                        disabled={isPending}
                      >
                        <Pencil className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                      <Button
                        onClick={() => setDeletingStudent(student)}
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        disabled={isPending}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {editingStudent && (
        <EditStudentModal
          student={editingStudent}
          onClose={() => setEditingStudent(null)}
          onSave={handleUpdate}
        />
      )}

      {deletingStudent && (
        <DeleteConfirmDialog
          title="Delete Student"
          description={`Are you sure you want to delete ${deletingStudent.firstName} ${deletingStudent.lastName}? This action can be reversed later.`}
          onConfirm={handleDelete}
          onCancel={() => setDeletingStudent(null)}
        />
      )}
    </>
  )
}
