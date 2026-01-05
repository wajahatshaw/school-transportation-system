'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Loader2, User, GraduationCap } from 'lucide-react'
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
import { formatUsPhoneInput, validateUsPhone } from '@/lib/phone'

interface AddStudentButtonProps {
  onSuccess?: () => void
}

export function AddStudentButton({ onSuccess }: AddStudentButtonProps) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    grade: '',
    studentAddress: '',
    pickupAddress: '',
    guardianName: '',
    guardianPhone: '',
    schoolName: '',
    schoolAddress: '',
    schoolPhone: '',
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

    const guardianPhoneCheck = validateUsPhone(formData.guardianPhone)
    if (!guardianPhoneCheck.ok) newErrors.guardianPhone = guardianPhoneCheck.error

    const schoolPhoneCheck = validateUsPhone(formData.schoolPhone)
    if (!schoolPhoneCheck.ok) newErrors.schoolPhone = schoolPhoneCheck.error
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    startTransition(async () => {
      try {
        const guardianPhoneCheck = validateUsPhone(formData.guardianPhone)
        const schoolPhoneCheck = validateUsPhone(formData.schoolPhone)

        const response = await fetch('/api/students', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            firstName: formData.firstName.trim(),
            lastName: formData.lastName.trim(),
            grade: formData.grade.trim() || undefined,
            studentAddress: formData.studentAddress.trim() || undefined,
            pickupAddress: formData.pickupAddress.trim() || undefined,
            guardianName: formData.guardianName.trim() || undefined,
            guardianPhone: guardianPhoneCheck.ok ? (guardianPhoneCheck.e164 || undefined) : undefined,
            schoolName: formData.schoolName.trim() || undefined,
            schoolAddress: formData.schoolAddress.trim() || undefined,
            schoolPhone: schoolPhoneCheck.ok ? (schoolPhoneCheck.e164 || undefined) : undefined,
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
        setFormData({
          firstName: '',
          lastName: '',
          grade: '',
          studentAddress: '',
          pickupAddress: '',
          guardianName: '',
          guardianPhone: '',
          schoolName: '',
          schoolAddress: '',
          schoolPhone: '',
        })
        setErrors({})
        
        // Refresh the page data
        if (onSuccess) {
          onSuccess()
        } else {
          router.refresh()
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

  const handlePhoneChange = (field: 'guardianPhone' | 'schoolPhone', value: string) => {
    const formatted = formatUsPhoneInput(value)
    setFormData((prev) => ({ ...prev, [field]: formatted.display }))

    const res = validateUsPhone(formatted.display)
    setErrors((prev) => ({
      ...prev,
      [field]: res.ok ? '' : res.error,
    }))
  }

  const handleClose = () => {
    if (!isPending) {
      setIsOpen(false)
      setFormData({
        firstName: '',
        lastName: '',
        grade: '',
        studentAddress: '',
        pickupAddress: '',
        guardianName: '',
        guardianPhone: '',
        schoolName: '',
        schoolAddress: '',
        schoolPhone: '',
      })
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
          className="w-[92vw] max-w-[980px]"
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                <p className="text-xs text-slate-500">Optional</p>
              </div>

              {/* Guardian Phone */}
              <div className="space-y-2">
                <Label htmlFor="guardianPhone" className="text-sm font-medium text-slate-700">
                  Parent/Guardian Phone
                </Label>
                <Input
                  id="guardianPhone"
                  value={formData.guardianPhone}
                  onChange={(e) => handlePhoneChange('guardianPhone', e.target.value)}
                  placeholder="+1 (248) 555-1212"
                  disabled={isPending}
                  inputMode="tel"
                  autoComplete="tel"
                  className={errors.guardianPhone ? 'border-red-500 focus-visible:ring-red-500' : ''}
                />
                {errors.guardianPhone && (
                  <p className="text-sm text-red-600">{errors.guardianPhone}</p>
                )}
              </div>

              {/* Guardian Name */}
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="guardianName" className="text-sm font-medium text-slate-700">
                  Parent/Guardian Name
                </Label>
                <Input
                  id="guardianName"
                  value={formData.guardianName}
                  onChange={(e) => handleChange('guardianName', e.target.value)}
                  placeholder="Parent/guardian full name"
                  disabled={isPending}
                />
              </div>

              {/* Student Address */}
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="studentAddress" className="text-sm font-medium text-slate-700">
                  Student Address
                </Label>
                <Input
                  id="studentAddress"
                  value={formData.studentAddress}
                  onChange={(e) => handleChange('studentAddress', e.target.value)}
                  placeholder="Home address"
                  disabled={isPending}
                />
              </div>

              {/* Pick-up Address */}
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="pickupAddress" className="text-sm font-medium text-slate-700">
                  Pick-up Address
                </Label>
                <Input
                  id="pickupAddress"
                  value={formData.pickupAddress}
                  onChange={(e) => handleChange('pickupAddress', e.target.value)}
                  placeholder="Pick-up location (if different)"
                  disabled={isPending}
                />
              </div>

              {/* School Name */}
              <div className="space-y-2">
                <Label htmlFor="schoolName" className="text-sm font-medium text-slate-700">
                  School Name
                </Label>
                <Input
                  id="schoolName"
                  value={formData.schoolName}
                  onChange={(e) => handleChange('schoolName', e.target.value)}
                  placeholder="School name"
                  disabled={isPending}
                />
              </div>

              {/* School Phone */}
              <div className="space-y-2">
                <Label htmlFor="schoolPhone" className="text-sm font-medium text-slate-700">
                  School Phone
                </Label>
                <Input
                  id="schoolPhone"
                  value={formData.schoolPhone}
                  onChange={(e) => handlePhoneChange('schoolPhone', e.target.value)}
                  placeholder="+1 (248) 555-1212"
                  disabled={isPending}
                  inputMode="tel"
                  autoComplete="tel"
                  className={errors.schoolPhone ? 'border-red-500 focus-visible:ring-red-500' : ''}
                />
                {errors.schoolPhone && (
                  <p className="text-sm text-red-600">{errors.schoolPhone}</p>
                )}
              </div>

              {/* School Address */}
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="schoolAddress" className="text-sm font-medium text-slate-700">
                  School Address
                </Label>
                <Input
                  id="schoolAddress"
                  value={formData.schoolAddress}
                  onChange={(e) => handleChange('schoolAddress', e.target.value)}
                  placeholder="School address"
                  disabled={isPending}
                />
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
