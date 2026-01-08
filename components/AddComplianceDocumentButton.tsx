'use client'

import { useState, useTransition, useEffect } from 'react'
import { Plus, Loader2, FileText, Calendar } from 'lucide-react'
import { createComplianceDocument } from '@/lib/actions'
import { toast } from 'sonner'
import { useQueryClient, useQuery } from '@tanstack/react-query'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Input, Label, Select } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

interface AddComplianceDocumentButtonProps {
  driverId: string
}

export function AddComplianceDocumentButton({ driverId }: AddComplianceDocumentButtonProps) {
  const queryClient = useQueryClient()
  const [isOpen, setIsOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [formData, setFormData] = useState({
    docType: '',
    customDocType: '',
    issuedAt: '',
    expiresAt: '',
    fileUrl: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [showCustomInput, setShowCustomInput] = useState(false)

  // Fetch required document types
  const { data: complianceRules } = useQuery({
    queryKey: ['compliance-rules'],
    queryFn: async () => {
      const res = await fetch('/api/compliance/rules')
      if (!res.ok) throw new Error('Failed to fetch compliance rules')
      const data = await res.json()
      return data.data || []
    },
    enabled: isOpen, // Only fetch when modal is open
  })

  // Get required document types from rules
  const requiredDocTypes = complianceRules
    ?.filter((rule: any) => rule.required)
    .map((rule: any) => rule.docType) || ['Driver License', 'Background Check']

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    
    const selectedDocType = showCustomInput ? formData.customDocType.trim() : formData.docType
    if (!selectedDocType) {
      newErrors.docType = 'Document type is required'
    }
    if (showCustomInput && !formData.customDocType.trim()) {
      newErrors.customDocType = 'Please enter a custom document type'
    }
    if (!formData.expiresAt) {
      newErrors.expiresAt = 'Expiry date is required'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    startTransition(async () => {
      try {
        const selectedDocType = showCustomInput ? formData.customDocType.trim() : formData.docType
        await createComplianceDocument({
          driverId,
          docType: selectedDocType,
          issuedAt: formData.issuedAt ? new Date(formData.issuedAt) : undefined,
          expiresAt: new Date(formData.expiresAt),
          fileUrl: formData.fileUrl.trim() || undefined,
        })
        toast.success('Document added successfully', {
          description: `${selectedDocType} has been added to the driver's compliance records.`
        })
        setIsOpen(false)
        setFormData({ docType: '', customDocType: '', issuedAt: '', expiresAt: '', fileUrl: '' })
        setShowCustomInput(false)
        setErrors({})
        // Invalidate caches so UI updates everywhere
        queryClient.invalidateQueries({ queryKey: ['compliance-documents', driverId] })
        queryClient.invalidateQueries({ queryKey: ['compliance-overview'] })
        queryClient.invalidateQueries({ queryKey: ['audit-logs'] })
        // Invalidate alert-related queries to update notification badge
        queryClient.invalidateQueries({ queryKey: ['compliance-alert-count'] })
        queryClient.invalidateQueries({ queryKey: ['compliance-expiring-documents'] })
        queryClient.invalidateQueries({ queryKey: ['compliance-summary'] })
        queryClient.invalidateQueries({ queryKey: ['compliance-drivers'] })
      } catch (error) {
        toast.error('Failed to add document', {
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

  const handleDocTypeChange = (value: string) => {
    if (value === 'custom') {
      setShowCustomInput(true)
      setFormData({ ...formData, docType: 'custom', customDocType: '' })
    } else {
      setShowCustomInput(false)
      setFormData({ ...formData, docType: value, customDocType: '' })
    }
    if (errors.docType || errors.customDocType) {
      setErrors({ ...errors, docType: '', customDocType: '' })
    }
  }

  const handleClose = () => {
    if (!isPending) {
      setIsOpen(false)
      setFormData({ docType: '', customDocType: '', issuedAt: '', expiresAt: '', fileUrl: '' })
      setShowCustomInput(false)
      setErrors({})
    }
  }

  return (
    <>
      <Button onClick={() => setIsOpen(true)} size="default" className="gap-2">
        <Plus className="h-4 w-4" />
        Add Document
      </Button>

      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent 
          onClose={handleClose}
          className="sm:max-w-[500px]"
        >
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-100">
                <FileText className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <DialogTitle className="text-xl">Add Compliance Document</DialogTitle>
                <DialogDescription className="text-sm text-slate-500 mt-1">
                  Add a new compliance document for this driver
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              {/* Document Type */}
              <div className="space-y-2">
                <Label htmlFor="docType" className="text-sm font-medium text-slate-700">
                  Document Type <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <FileText className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 z-10" />
                  <Select
                    id="docType"
                    value={showCustomInput ? 'custom' : formData.docType}
                    onChange={(e) => handleDocTypeChange(e.target.value)}
                    disabled={isPending}
                    className={`pl-10 appearance-none ${errors.docType ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                    autoFocus
                  >
                    <option value="">Select a document type...</option>
                    {requiredDocTypes.map((docType: string) => (
                      <option key={docType} value={docType}>
                        {docType}
                      </option>
                    ))}
                    <option value="custom">Custom (Enter your own)</option>
                  </Select>
                </div>
                {showCustomInput && (
                  <div className="mt-2">
                    <Input
                      id="customDocType"
                      value={formData.customDocType}
                      onChange={(e) => handleChange('customDocType', e.target.value)}
                      placeholder="Enter custom document type..."
                      disabled={isPending}
                      className={errors.customDocType ? 'border-red-500 focus-visible:ring-red-500' : ''}
                    />
                    {errors.customDocType && (
                      <p className="text-sm text-red-600 mt-1">{errors.customDocType}</p>
                    )}
                  </div>
                )}
                {errors.docType && !showCustomInput && (
                  <p className="text-sm text-red-600">{errors.docType}</p>
                )}
              </div>

              {/* Issued Date */}
              <div className="space-y-2">
                <Label htmlFor="issuedAt" className="text-sm font-medium text-slate-700">
                  Issued Date
                </Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    id="issuedAt"
                    type="date"
                    value={formData.issuedAt}
                    onChange={(e) => handleChange('issuedAt', e.target.value)}
                    disabled={isPending}
                    className="pl-10"
                  />
                </div>
                <p className="text-xs text-slate-500">Optional: When was this document issued?</p>
              </div>

              {/* Expiry Date */}
              <div className="space-y-2">
                <Label htmlFor="expiresAt" className="text-sm font-medium text-slate-700">
                  Expiry Date <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    id="expiresAt"
                    type="date"
                    value={formData.expiresAt}
                    onChange={(e) => handleChange('expiresAt', e.target.value)}
                    disabled={isPending}
                    className={`pl-10 ${errors.expiresAt ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                  />
                </div>
                {errors.expiresAt && (
                  <p className="text-sm text-red-600">{errors.expiresAt}</p>
                )}
              </div>

              {/* File URL */}
              <div className="space-y-2">
                <Label htmlFor="fileUrl" className="text-sm font-medium text-slate-700">
                  File URL
                </Label>
                <Input
                  id="fileUrl"
                  type="url"
                  value={formData.fileUrl}
                  onChange={(e) => handleChange('fileUrl', e.target.value)}
                  placeholder="https://..."
                  disabled={isPending}
                />
                <p className="text-xs text-slate-500">Optional: Link to the document file</p>
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
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Document
                  </>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
