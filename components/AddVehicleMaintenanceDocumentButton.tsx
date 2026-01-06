'use client'

import { useState, useTransition, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Loader2, Wrench, Upload, X, Image as ImageIcon } from 'lucide-react'
import { createVehicleMaintenanceDocument } from '@/lib/actions'
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

interface AddVehicleMaintenanceDocumentButtonProps {
  vehicleId: string
}

export function AddVehicleMaintenanceDocumentButton({ vehicleId }: AddVehicleMaintenanceDocumentButtonProps) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [uploading, setUploading] = useState(false)
  const [uploadedFile, setUploadedFile] = useState<{ file: File; preview?: string } | null>(null)
  const [formData, setFormData] = useState({
    notes: '',
    scheduledDate: '',
    maintenanceStatus: 'pending',
    completedDate: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    
    if (formData.maintenanceStatus === 'completed' && !formData.completedDate) {
      newErrors.completedDate = 'Completed date is required when status is completed'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
    if (!allowedTypes.includes(file.type)) {
      toast.error('Invalid file type', {
        description: 'Please upload an image (JPEG, PNG, WebP) or PDF file.'
      })
      return
    }

    // Validate file size (10MB)
    const maxSize = 10 * 1024 * 1024
    if (file.size > maxSize) {
      toast.error('File too large', {
        description: 'Please upload a file smaller than 10MB.'
      })
      return
    }

    // Create preview for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setUploadedFile({ file, preview: reader.result as string })
      }
      reader.readAsDataURL(file)
    } else {
      setUploadedFile({ file })
    }
  }

  const handleRemoveFile = () => {
    setUploadedFile(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleUploadFile = async (): Promise<string | null> => {
    if (!uploadedFile) return null

    setUploading(true)
    try {
      const uploadFormData = new FormData()
      uploadFormData.append('file', uploadedFile.file)

      const response = await fetch('/api/upload/maintenance-doc', {
        method: 'POST',
        body: uploadFormData,
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to upload file')
      }

      const data = await response.json()
      return data.url
    } catch (error) {
      console.error('Upload error:', error)
      // Provide user-friendly error message
      if (error instanceof Error) {
        if (error.message.includes('Bucket not found') || error.message.includes('bucket')) {
          throw new Error('Storage bucket not configured. Please contact your administrator to set up the "sts_assets" bucket in Supabase.')
        }
        throw new Error(error.message || 'Failed to upload file. Please try again.')
      }
      throw new Error('Failed to upload file. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    startTransition(async () => {
      try {
        // Upload file if present
        let fileUrl: string | undefined = undefined
        if (uploadedFile) {
          fileUrl = await handleUploadFile() || undefined
        }

        await createVehicleMaintenanceDocument({
          vehicleId,
          maintenanceDocUrl: fileUrl,
          notes: formData.notes.trim() || undefined,
          scheduledDate: formData.scheduledDate ? new Date(formData.scheduledDate) : undefined,
          maintenanceStatus: formData.maintenanceStatus,
          completedDate: formData.completedDate ? new Date(formData.completedDate) : undefined,
        })
        
        toast.success('Maintenance document added successfully', {
          description: 'The maintenance record has been added to the vehicle.'
        })
        
        setIsOpen(false)
        setFormData({ notes: '', scheduledDate: '', maintenanceStatus: 'pending', completedDate: '' })
        setUploadedFile(null)
        setErrors({})
        
        // Refresh the page to show the new document
        router.refresh()
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to add maintenance document'
        toast.error('Failed to add maintenance document', {
          description: errorMessage.includes('bucket') || errorMessage.includes('Storage')
            ? 'Storage bucket not configured. Please contact your administrator.'
            : errorMessage
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
    if (!isPending && !uploading) {
      setIsOpen(false)
      setFormData({ notes: '', scheduledDate: '', maintenanceStatus: 'pending', completedDate: '' })
      setUploadedFile(null)
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
          className="sm:max-w-[600px]"
        >
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
                <Wrench className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <DialogTitle className="text-xl">Add Maintenance Document</DialogTitle>
                <DialogDescription className="text-sm text-slate-500 mt-1">
                  Add a new maintenance record for this vehicle
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              {/* File Upload */}
              <div className="space-y-2">
                <Label htmlFor="file" className="text-sm font-medium text-slate-700">
                  Maintenance Document
                </Label>
                <div className="mt-1">
                  {!uploadedFile ? (
                    <div className="flex items-center justify-center w-full">
                      <label
                        htmlFor="file-upload"
                        className="flex flex-col items-center justify-center w-full h-32 border-2 border-slate-300 border-dashed rounded-lg cursor-pointer bg-slate-50 hover:bg-slate-100 transition-colors"
                      >
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                          <Upload className="w-8 h-8 mb-2 text-slate-400" />
                          <p className="mb-2 text-sm text-slate-500">
                            <span className="font-semibold">Click to upload</span> or drag and drop
                          </p>
                          <p className="text-xs text-slate-500">
                            PNG, JPG, WebP or PDF (MAX. 10MB)
                          </p>
                        </div>
                        <input
                          id="file-upload"
                          ref={fileInputRef}
                          type="file"
                          className="hidden"
                          accept="image/jpeg,image/png,image/webp,application/pdf"
                          onChange={handleFileSelect}
                          disabled={isPending || uploading}
                        />
                      </label>
                    </div>
                  ) : (
                    <div className="relative border border-slate-200 rounded-lg p-4 bg-slate-50">
                      <div className="flex items-center gap-3">
                        {uploadedFile.preview ? (
                          <img
                            src={uploadedFile.preview}
                            alt="Preview"
                            className="w-16 h-16 object-cover rounded"
                          />
                        ) : (
                          <div className="w-16 h-16 bg-slate-200 rounded flex items-center justify-center">
                            <ImageIcon className="w-8 h-8 text-slate-400" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900 truncate">
                            {uploadedFile.file.name}
                          </p>
                          <p className="text-xs text-slate-500">
                            {(uploadedFile.file.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={handleRemoveFile}
                          disabled={isPending || uploading}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
                <p className="text-xs text-slate-500">Optional: Upload maintenance document or receipt</p>
              </div>

              {/* Scheduled Date */}
              <div className="space-y-2">
                <Label htmlFor="scheduledDate" className="text-sm font-medium text-slate-700">
                  Scheduled Date
                </Label>
                <Input
                  id="scheduledDate"
                  type="date"
                  value={formData.scheduledDate}
                  onChange={(e) => handleChange('scheduledDate', e.target.value)}
                  disabled={isPending || uploading}
                />
                <p className="text-xs text-slate-500">Optional: When is this maintenance scheduled?</p>
              </div>

              {/* Maintenance Status */}
              <div className="space-y-2">
                <Label htmlFor="maintenanceStatus" className="text-sm font-medium text-slate-700">
                  Status <span className="text-red-500">*</span>
                </Label>
                <select
                  id="maintenanceStatus"
                  value={formData.maintenanceStatus}
                  onChange={(e) => handleChange('maintenanceStatus', e.target.value)}
                  disabled={isPending || uploading}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="pending">Pending</option>
                  <option value="completed">Completed</option>
                </select>
              </div>

              {/* Completed Date */}
              {formData.maintenanceStatus === 'completed' && (
                <div className="space-y-2">
                  <Label htmlFor="completedDate" className="text-sm font-medium text-slate-700">
                    Completed Date {formData.maintenanceStatus === 'completed' && <span className="text-red-500">*</span>}
                  </Label>
                  <Input
                    id="completedDate"
                    type="date"
                    value={formData.completedDate}
                    onChange={(e) => handleChange('completedDate', e.target.value)}
                    disabled={isPending || uploading}
                    className={errors.completedDate ? 'border-red-500 focus-visible:ring-red-500' : ''}
                  />
                  {errors.completedDate && (
                    <p className="text-sm text-red-600">{errors.completedDate}</p>
                  )}
                </div>
              )}

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes" className="text-sm font-medium text-slate-700">
                  Notes
                </Label>
                <textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => handleChange('notes', e.target.value)}
                  placeholder="Add any additional notes about this maintenance..."
                  disabled={isPending || uploading}
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
                <p className="text-xs text-slate-500">Optional: Additional details about the maintenance</p>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isPending || uploading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isPending || uploading}
                className="min-w-[120px]"
              >
                {(isPending || uploading) ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {uploading ? 'Uploading...' : 'Adding...'}
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

