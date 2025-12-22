'use client'

import { useState, useTransition } from 'react'
import { Plus, Loader2, User, GraduationCap } from 'lucide-react'
import { createStudent } from '@/lib/actions'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Input, Label } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

interface AddStudentButtonProps {
  onSuccess?: () => void
}

export function AddStudentButton({ onSuccess }: AddStudentButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    grade: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

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
        await createStudent({
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
          grade: formData.grade.trim() || undefined,
        })
        toast.success('Student added successfully', {
          description: `${formData.firstName} ${formData.lastName} has been added to the system.`
        })
        setIsOpen(false)
        setFormData({ firstName: '', lastName: '', grade: '' })
        setErrors({})
        
        // Call onSuccess to refresh the data
        if (onSuccess) {
          onSuccess()
        }
      } catch (error) {
        toast.error('Failed to add student', {
          description: 'Please try again or contact support if the problem persists.'
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
      setFormData({ firstName: '', lastName: '', grade: '' })
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
