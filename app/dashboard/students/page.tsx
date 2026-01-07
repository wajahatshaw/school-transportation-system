import { StudentsPageClient } from './students-page-client'

export default async function StudentsPage() {
  return (
    <div className="space-y-4 sm:space-y-6 w-full">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">Students</h1>
        <p className="text-sm sm:text-base text-slate-600 mt-1">Manage student records and information</p>
      </div>

      <StudentsPageClient />
    </div>
  )
}
