'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Student } from '@prisma/client'
import { getStudents } from '@/lib/actions'
import { StudentsTable } from '@/components/StudentsTable'

interface StudentsPageClientProps {
  initialStudents: Student[]
}

export function StudentsPageClient({ initialStudents }: StudentsPageClientProps) {
  const [students, setStudents] = useState(initialStudents)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

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

  return <StudentsTable students={students} onUpdate={handleUpdate} />
}
