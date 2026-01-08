'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { DriverComplianceDocument } from '@prisma/client'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input, Label, Select } from '@/components/ui/input'
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
  // Check if current docType is in the required list
  const { data: complianceRules } = useQuery({
    queryKey: ['compliance-rules'],
    queryFn: async () => {
      const res = await fetch('/api/compliance/rules')
      if (!res.ok) throw new Error('Failed to fetch compliance rules')
      const data = await res.json()
      return data.data || []
    },
  })

  const requiredDocTypes = complianceRules
    ?.filter((rule: any) => rule.required)
    .map((rule: any) => rule.docType) || ['Driver License', 'Background Check']

  const isCustomType = !requiredDocTypes.includes(document.docType)
  
  const [formData, setFormData] = useState({
    docType: isCustomType ? 'custom' : document.docType,
    customDocType: isCustomType ? document.docType : '',
    issuedAt: document.issuedAt ? new Date(document.issuedAt).toISOString().split('T')[0] : '',
    expiresAt: new Date(document.expiresAt).toISOString().split('T')[0],
    fileUrl: document.fileUrl || '',
  })
  const [showCustomInput, setShowCustomInput] = useState(isCustomType)

  const handleDocTypeChange = (value: string) => {
    if (value === 'custom') {
      setShowCustomInput(true)
      setFormData({ ...formData, docType: 'custom', customDocType: formData.customDocType || '' })
    } else {
      setShowCustomInput(false)
      setFormData({ ...formData, docType: value, customDocType: '' })
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const selectedDocType = showCustomInput ? formData.customDocType.trim() : formData.docType
    if (!selectedDocType) {
      return
    }
    onSave({
      docType: selectedDocType,
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
              <Select
                id="docType"
                value={formData.docType}
                onChange={(e) => handleDocTypeChange(e.target.value)}
                required
                className="appearance-none"
              >
                <option value="">Select a document type...</option>
                {requiredDocTypes.map((docType: string) => (
                  <option key={docType} value={docType}>
                    {docType}
                  </option>
                ))}
                <option value="custom">Custom (Enter your own)</option>
              </Select>
              {showCustomInput && (
                <Input
                  id="customDocType"
                  value={formData.customDocType}
                  onChange={(e) => setFormData({ ...formData, customDocType: e.target.value })}
                  placeholder="Enter custom document type..."
                  required={showCustomInput}
                />
              )}
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
