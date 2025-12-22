'use client'

import { useEffect, useState } from 'react'
import { getStudents } from '@/lib/actions'
import { StudentsTable } from '@/components/StudentsTable'
import { AddStudentButton } from '@/components/AddStudentButton'
import { TableSkeleton } from '@/components/ui/skeleton'
import { useDataCache } from '@/lib/data-cache'

export default function StudentsPage() {
  const { cache, setStudents } = useDataCache()
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    // Only fetch if we don't have cached data
    if (!cache.students) {
      loadStudents()
    }
  }, [cache.students])

  const loadStudents = async () => {
    try {
      setIsLoading(true)
      const data = await getStudents()
      setStudents(data)
    } catch (error) {
      console.error('Failed to load students:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Students</h1>
          <p className="text-slate-600 mt-1">Manage student records and information</p>
        </div>
        <AddStudentButton onSuccess={loadStudents} />
      </div>

      {isLoading || !cache.students ? (
        <TableSkeleton />
      ) : (
        <StudentsTable students={cache.students} onUpdate={loadStudents} />
      )}
    </div>
  )
}
