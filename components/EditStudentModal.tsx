'use client'

import { useState, useTransition } from 'react'
import { Loader2, User, GraduationCap } from 'lucide-react'
import { Student } from '@prisma/client'
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
import { TimePicker } from '@/components/TimePicker'
import { normalizeTimeHHMM, validateTimeHHMM } from '@/lib/time'

interface EditStudentModalProps {
  student: Student
  onClose: () => void
  onSave: (data: {
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
  }) => Promise<void>
  tenantName?: string
}

export function EditStudentModal({ student, onClose, onSave, tenantName = '' }: EditStudentModalProps) {
  const [isPending, startTransition] = useTransition()
  // Use tenant name if available, otherwise fall back to student's school name
  const defaultSchoolName = tenantName || (student as any).schoolName || ''
  const [formData, setFormData] = useState({
    firstName: student.firstName,
    lastName: student.lastName,
    grade: student.grade || '',
    studentAddress: (student as any).studentAddress || '',
    morningPickupTime: (student as any).morningPickupTime || '',
    guardianName: (student as any).guardianName || '',
    guardianPhone: (student as any).guardianPhone || '',
    schoolName: defaultSchoolName,
    schoolAddress: (student as any).schoolAddress || '',
    schoolPhone: (student as any).schoolPhone || '',
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

    const morningPickupCheck = validateTimeHHMM(formData.morningPickupTime)
    if (!morningPickupCheck.ok) newErrors.morningPickupTime = morningPickupCheck.error
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return

    startTransition(async () => {
      const guardianPhoneCheck = validateUsPhone(formData.guardianPhone)
      const schoolPhoneCheck = validateUsPhone(formData.schoolPhone)
      const morningPickup = normalizeTimeHHMM(formData.morningPickupTime)

      await onSave({
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        grade: formData.grade.trim() || undefined,
        studentAddress: formData.studentAddress.trim() || null,
        morningPickupTime: morningPickup || null,
        guardianName: formData.guardianName.trim() || null,
        guardianPhone: guardianPhoneCheck.ok ? (guardianPhoneCheck.e164 || null) : null,
        schoolName: tenantName || formData.schoolName.trim() || null, // Always use tenant name if available
        schoolAddress: formData.schoolAddress.trim() || null,
        schoolPhone: schoolPhoneCheck.ok ? (schoolPhoneCheck.e164 || null) : null,
      })
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

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent 
        onClose={onClose}
        className="w-[95vw] sm:w-[92vw] max-w-[980px] max-h-[90vh] overflow-hidden flex flex-col"
      >
        <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-6">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
              <User className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <DialogTitle className="text-xl">Edit Student</DialogTitle>
              <DialogDescription className="text-sm text-slate-500 mt-1">
                Update student information below
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 min-h-0 overflow-y-auto space-y-4 sm:space-y-6 pb-4 px-4 sm:px-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
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

            {/* Schedule (Times) */}
            <div className="md:col-span-2 pt-2">
              <p className="text-sm font-medium text-slate-800">Schedule</p>
              <p className="text-xs text-slate-500 mt-1">
                All times use a consistent format (stored as <span className="font-mono">HH:mm</span>).
              </p>
            </div>

            <TimePicker
              id="morningPickupTime"
              label="Morning Pickup Time"
              value={formData.morningPickupTime}
              onChange={(v) => handleChange('morningPickupTime', v)}
              disabled={isPending}
              error={errors.morningPickupTime}
              placeholder="Select morning pickup"
            />

            {/* School Name */}
            <div className="space-y-2">
              <Label htmlFor="schoolName" className="text-sm font-medium text-slate-700">
                School Name
              </Label>
              <Input
                id="schoolName"
                value={tenantName || formData.schoolName}
                readOnly
                disabled={true}
                className="bg-slate-50 cursor-not-allowed"
                title="School name is automatically set to your organization name"
              />
              <p className="text-xs text-slate-500">Automatically set to your organization name</p>
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
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t bg-white mt-4 sticky bottom-0 z-10 px-4 sm:px-6 pb-4 sm:pb-6">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
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
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
