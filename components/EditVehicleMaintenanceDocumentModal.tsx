'use client'

import { useState, useRef } from 'react'
import { Wrench, Upload, X, Image as ImageIcon, ExternalLink } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Input, Label } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

type VehicleMaintenanceDocument = {
  id: string
  tenantId: string
  vehicleId: string
  maintenanceDocUrl: string | null
  notes: string | null
  scheduledDate: Date | null
  maintenanceStatus: string
  completedDate: Date | null
  deletedAt: Date | null
  deletedBy: string | null
  createdAt: Date
  updatedAt: Date
}

interface EditVehicleMaintenanceDocumentModalProps {
  document: VehicleMaintenanceDocument
  onClose: () => void
  onSave: (data: {
    maintenanceDocUrl?: string
    notes?: string
    scheduledDate?: Date
    maintenanceStatus?: string
    completedDate?: Date
  }) => Promise<void>
}

export function EditVehicleMaintenanceDocumentModal({
  document,
  onClose,
  onSave,
}: EditVehicleMaintenanceDocumentModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadedFile, setUploadedFile] = useState<{ file: File; preview?: string } | null>(null)
  const [formData, setFormData] = useState({
    notes: document.notes || '',
    scheduledDate: document.scheduledDate ? new Date(document.scheduledDate).toISOString().split('T')[0] : '',
    maintenanceStatus: document.maintenanceStatus,
    completedDate: document.completedDate ? new Date(document.completedDate).toISOString().split('T')[0] : '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
    if (!allowedTypes.includes(file.type)) {
      toast.error('Invalid file type', {
        description: 'Please upload an image (JPEG, PNG, WebP) or PDF file.'
      })
      return
    }

    const maxSize = 10 * 1024 * 1024
    if (file.size > maxSize) {
      toast.error('File too large', {
        description: 'Please upload a file smaller than 10MB.'
      })
      return
    }

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

    // Validate
    const newErrors: Record<string, string> = {}
    if (formData.maintenanceStatus === 'completed' && !formData.completedDate) {
      newErrors.completedDate = 'Completed date is required when status is completed'
    }
    setErrors(newErrors)
    if (Object.keys(newErrors).length > 0) return

    try {
      // Upload file if new one was selected
      let fileUrl: string | undefined = undefined
      if (uploadedFile) {
        fileUrl = await handleUploadFile() || undefined
      } else if (document.maintenanceDocUrl) {
        // Keep existing URL if no new file uploaded
        fileUrl = document.maintenanceDocUrl
      }

      await onSave({
        ...(fileUrl !== undefined && { maintenanceDocUrl: fileUrl }),
        notes: formData.notes.trim() || undefined,
        scheduledDate: formData.scheduledDate ? new Date(formData.scheduledDate) : undefined,
        maintenanceStatus: formData.maintenanceStatus,
        completedDate: formData.completedDate ? new Date(formData.completedDate) : undefined,
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update document'
      toast.error('Failed to update document', {
        description: errorMessage.includes('bucket') || errorMessage.includes('Storage')
          ? 'Storage bucket not configured. Please contact your administrator.'
          : errorMessage
      })
    }
  }

  const handleChange = (field: string, value: string) => {
    setFormData({ ...formData, [field]: value })
    if (errors[field]) {
      setErrors({ ...errors, [field]: '' })
    }
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent 
        onClose={onClose}
        className="sm:max-w-[600px]"
      >
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
              <Wrench className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <DialogTitle className="text-xl">Edit Maintenance Document</DialogTitle>
              <DialogDescription className="text-sm text-slate-500 mt-1">
                Update maintenance record information
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            {/* Current/New File */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-700">
                Maintenance Document
              </Label>
              {document.maintenanceDocUrl && !uploadedFile && (
                <div className="border border-slate-200 rounded-lg p-4 bg-slate-50">
                  <div className="flex items-center gap-3">
                    <ImageIcon className="h-8 w-8 text-slate-400" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-900">Current Document</p>
                      <a
                        href={document.maintenanceDocUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 mt-1"
                      >
                        View Document
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </div>
                </div>
              )}
              
              {!uploadedFile ? (
                <div className="flex items-center justify-center w-full">
                  <label
                    htmlFor="file-upload-edit"
                    className="flex flex-col items-center justify-center w-full h-32 border-2 border-slate-300 border-dashed rounded-lg cursor-pointer bg-slate-50 hover:bg-slate-100 transition-colors"
                  >
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <Upload className="w-8 h-8 mb-2 text-slate-400" />
                      <p className="mb-2 text-sm text-slate-500">
                        <span className="font-semibold">Click to upload</span> new document
                      </p>
                      <p className="text-xs text-slate-500">
                        PNG, JPG, WebP or PDF (MAX. 10MB)
                      </p>
                    </div>
                    <input
                      id="file-upload-edit"
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      accept="image/jpeg,image/png,image/webp,application/pdf"
                      onChange={handleFileSelect}
                      disabled={uploading}
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
                      disabled={uploading}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
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
                disabled={uploading}
              />
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
                disabled={uploading}
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
                  Completed Date <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="completedDate"
                  type="date"
                  value={formData.completedDate}
                  onChange={(e) => handleChange('completedDate', e.target.value)}
                  disabled={uploading}
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
                disabled={uploading}
                rows={3}
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={uploading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={uploading}
              className="min-w-[120px]"
            >
              {uploading ? (
                <>
                  <Upload className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
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

