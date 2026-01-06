'use client'

import { useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Driver, Student, Vehicle } from '@prisma/client'
import { getStudents } from '@/lib/actions'
import { StudentsTable } from '@/components/StudentsTable'

interface StudentsPageClientProps {
  initialStudents: Student[]
  drivers: Driver[]
  vehicles: Vehicle[]
}

export function StudentsPageClient({ initialStudents, drivers, vehicles }: StudentsPageClientProps) {
  const [students, setStudents] = useState(initialStudents)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  // Sync state when props change (after router.refresh())
  useEffect(() => {
    setStudents(initialStudents)
  }, [initialStudents])

  const handleUpdate = () => {
    startTransition(async () => {
      try {
        const updatedStudents = await getStudents()
        setStudents(updatedStudents)
        router.refresh()
      } catch (error) {
        console.error('Failed to refresh students:', error)
      }
    })
  }

  return <StudentsTable students={students} drivers={drivers} vehicles={vehicles} onUpdate={handleUpdate} />
}
