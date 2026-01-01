import { Suspense } from 'react'
import { AddStudentButton } from '@/components/AddStudentButton'
import { StudentsPageClient } from './students-page-client'

export default async function StudentsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Students</h1>
          <p className="text-slate-600 mt-1">Manage student records and information</p>
        </div>
        <AddStudentButton />
      </div>

      <StudentsPageClient />
    </div>
  )
}
