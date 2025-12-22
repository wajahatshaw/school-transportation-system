'use client'

import { useState, useTransition } from 'react'
import { Student } from '@prisma/client'
import { Pencil, Trash2 } from 'lucide-react'
import { updateStudent, softDeleteStudent } from '@/lib/actions'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { EditStudentModal } from './EditStudentModal'
import { DeleteConfirmDialog } from './DeleteConfirmDialog'

interface StudentsTableProps {
  students: Student[]
  onUpdate?: () => void
}

export function StudentsTable({ students, onUpdate }: StudentsTableProps) {
  const [editingStudent, setEditingStudent] = useState<Student | null>(null)
  const [deletingStudent, setDeletingStudent] = useState<Student | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleEdit = (student: Student) => {
    setEditingStudent(student)
  }

  const handleUpdate = async (data: { firstName: string; lastName: string; grade?: string }) => {
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
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  First Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Last Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Grade
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
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
                    <div className="text-sm font-medium text-slate-900">{student.firstName}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-slate-900">{student.lastName}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-slate-500">{student.grade || 'N/A'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge variant={student.isDeleted ? 'danger' : 'success'}>
                      {student.isDeleted ? 'Deleted' : 'Active'}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-2">
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
