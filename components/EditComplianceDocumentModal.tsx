'use client'

import { useState } from 'react'
import { DriverComplianceDocument } from '@prisma/client'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input, Label } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

interface EditComplianceDocumentModalProps {
  document: DriverComplianceDocument
  onClose: () => void
  onSave: (data: { docType: string; issuedAt?: Date; expiresAt: Date; fileUrl?: string }) => void
}

export function EditComplianceDocumentModal({
  document,
  onClose,
  onSave,
}: EditComplianceDocumentModalProps) {
  const [formData, setFormData] = useState({
    docType: document.docType,
    issuedAt: document.issuedAt ? new Date(document.issuedAt).toISOString().split('T')[0] : '',
    expiresAt: new Date(document.expiresAt).toISOString().split('T')[0],
    fileUrl: document.fileUrl || '',
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave({
      docType: formData.docType,
      issuedAt: formData.issuedAt ? new Date(formData.issuedAt) : undefined,
      expiresAt: new Date(formData.expiresAt),
      fileUrl: formData.fileUrl || undefined,
    })
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent onClose={onClose}>
        <DialogHeader>
          <DialogTitle>Edit Compliance Document</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="docType">Document Type *</Label>
              <Input
                id="docType"
                value={formData.docType}
                onChange={(e) => setFormData({ ...formData, docType: e.target.value })}
                required
                placeholder="e.g., Driver's License, Medical Certificate"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="issuedAt">Issued Date</Label>
              <Input
                id="issuedAt"
                type="date"
                value={formData.issuedAt}
                onChange={(e) => setFormData({ ...formData, issuedAt: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="expiresAt">Expiry Date *</Label>
              <Input
                id="expiresAt"
                type="date"
                value={formData.expiresAt}
                onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fileUrl">File URL</Label>
              <Input
                id="fileUrl"
                type="url"
                value={formData.fileUrl}
                onChange={(e) => setFormData({ ...formData, fileUrl: e.target.value })}
                placeholder="https://..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">Save Changes</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
