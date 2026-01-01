'use client'

import { useState, useTransition } from 'react'
import { Plus, Loader2, User, GraduationCap } from 'lucide-react'
import { toast } from 'sonner'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Input, Label } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { getRoutes } from '@/lib/actions'

interface AddStudentButtonProps {
  onSuccess?: () => void
}

export function AddStudentButton({ onSuccess }: AddStudentButtonProps) {
  const queryClient = useQueryClient()
  const [isOpen, setIsOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    grade: '',
    routeId: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const routesQuery = useQuery<any[]>({
    queryKey: ['routes'],
    queryFn: getRoutes as any,
    enabled: isOpen,
  })

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    
    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required'
    }
    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    startTransition(async () => {
      try {
        const response = await fetch('/api/students', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            firstName: formData.firstName.trim(),
            lastName: formData.lastName.trim(),
            grade: formData.grade.trim() || undefined,
            routeId: formData.routeId || undefined,
          }),
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Failed to create student')
        }

        toast.success('Student added successfully', {
          description: `${formData.firstName} ${formData.lastName} has been added to the system.`
        })
        setIsOpen(false)
        setFormData({ firstName: '', lastName: '', grade: '', routeId: '' })
        setErrors({})
        
        // Refresh the page data
        if (onSuccess) {
          onSuccess()
        } else {
          queryClient.invalidateQueries({ queryKey: ['students'] })
          queryClient.invalidateQueries({ queryKey: ['routes'] })
        }
      } catch (error) {
        toast.error('Failed to add student', {
          description: error instanceof Error ? error.message : 'Please try again or contact support if the problem persists.'
        })
      }
    })
  }

  const handleChange = (field: string, value: string) => {
    setFormData({ ...formData, [field]: value })
    if (errors[field]) {
      setErrors({ ...errors, [field]: '' })
    }
  }

  const handleClose = () => {
    if (!isPending) {
      setIsOpen(false)
      setFormData({ firstName: '', lastName: '', grade: '', routeId: '' })
      setErrors({})
    }
  }

  return (
    <>
      <Button onClick={() => setIsOpen(true)} size="default" className="gap-2">
        <Plus className="h-4 w-4" />
        Add Student
      </Button>

      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent 
          onClose={handleClose}
          className="sm:max-w-[500px]"
        >
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
                <User className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <DialogTitle className="text-xl">Add New Student</DialogTitle>
                <DialogDescription className="text-sm text-slate-500 mt-1">
                  Enter student information to add them to the system
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              {/* First Name */}
              <div className="space-y-2">
                <Label htmlFor="firstName" className="text-sm font-medium text-slate-700">
                  First Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) => handleChange('firstName', e.target.value)}
                  placeholder="Enter first name"
                  disabled={isPending}
                  className={errors.firstName ? 'border-red-500 focus-visible:ring-red-500' : ''}
                  autoFocus
                />
                {errors.firstName && (
                  <p className="text-sm text-red-600">{errors.firstName}</p>
                )}
              </div>

              {/* Last Name */}
              <div className="space-y-2">
                <Label htmlFor="lastName" className="text-sm font-medium text-slate-700">
                  Last Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) => handleChange('lastName', e.target.value)}
                  placeholder="Enter last name"
                  disabled={isPending}
                  className={errors.lastName ? 'border-red-500 focus-visible:ring-red-500' : ''}
                />
                {errors.lastName && (
                  <p className="text-sm text-red-600">{errors.lastName}</p>
                )}
              </div>

              {/* Grade */}
              <div className="space-y-2">
                <Label htmlFor="grade" className="text-sm font-medium text-slate-700">
                  Grade
                </Label>
                <div className="relative">
                  <GraduationCap className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    id="grade"
                    value={formData.grade}
                    onChange={(e) => handleChange('grade', e.target.value)}
                    placeholder="e.g., 10th, Grade 5"
                    disabled={isPending}
                    className="pl-10"
                  />
                </div>
                <p className="text-xs text-slate-500">Optional: Specify the student's grade level</p>
              </div>

              {/* Route Assignment */}
              <div className="space-y-2">
                <Label htmlFor="routeId" className="text-sm font-medium text-slate-700">
                  Assign to Route
                </Label>
                <select
                  id="routeId"
                  value={formData.routeId}
                  onChange={(e) => handleChange('routeId', e.target.value)}
                  disabled={isPending || routesQuery.isLoading}
                  className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">No route (assign later)</option>
                  {(routesQuery.data ?? []).filter((r: any) => !r.deletedAt).map((route: any) => (
                    <option key={route.id} value={route.id}>
                      {route.name} ({route.type})
                    </option>
                  ))}
                </select>
                <p className="text-xs text-slate-500">
                  Optional: Assign student to a route for daily trips
                </p>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                className="min-w-[120px]"
              >
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Adding...
                  </>
                ) : (
                  'Add Student'
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
