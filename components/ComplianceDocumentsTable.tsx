'use client'

import { useState, useTransition, useEffect } from 'react'
import { DriverComplianceDocument } from '@prisma/client'
import { Pencil, Trash2, CheckCircle, AlertTriangle, XCircle } from 'lucide-react'
import { updateComplianceDocument, deleteComplianceDocument } from '@/lib/actions'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { formatDate, getComplianceStatus } from '@/lib/utils'
import { EditComplianceDocumentModal } from './EditComplianceDocumentModal'
import { DeleteConfirmDialog } from './DeleteConfirmDialog'
import { useQueryClient } from '@tanstack/react-query'

interface ComplianceDocumentsTableProps {
  documents: DriverComplianceDocument[]
  driverId: string
}

export function ComplianceDocumentsTable({
  documents: initialDocuments,
  driverId,
}: ComplianceDocumentsTableProps) {
  const queryClient = useQueryClient()
  const [documents, setDocuments] = useState(initialDocuments)
  const [editingDoc, setEditingDoc] = useState<DriverComplianceDocument | null>(null)
  const [deletingDoc, setDeletingDoc] = useState<DriverComplianceDocument | null>(null)
  const [isPending, startTransition] = useTransition()

  // Sync state when props change (after router.refresh())
  useEffect(() => {
    setDocuments(initialDocuments)
  }, [initialDocuments])

  const handleUpdate = async (data: {
    docType: string
    issuedAt?: Date
    expiresAt: Date
    fileUrl?: string
  }) => {
    if (!editingDoc) return

    const updatedDoc = { ...editingDoc, ...data }
    setDocuments((prev) => prev.map((d) => (d.id === editingDoc.id ? updatedDoc : d)))
    setEditingDoc(null)

    startTransition(async () => {
      try {
        await updateComplianceDocument(editingDoc.id, data)
        toast.success('Document updated successfully')
        queryClient.invalidateQueries({ queryKey: ['compliance-documents', driverId] })
        queryClient.invalidateQueries({ queryKey: ['compliance-overview'] })
        queryClient.invalidateQueries({ queryKey: ['audit-logs'] })
        // Invalidate alert-related queries to update notification badge
        queryClient.invalidateQueries({ queryKey: ['compliance-alert-count'] })
        queryClient.invalidateQueries({ queryKey: ['compliance-expiring-documents'] })
        queryClient.invalidateQueries({ queryKey: ['compliance-summary'] })
        queryClient.invalidateQueries({ queryKey: ['compliance-drivers'] })
      } catch (error) {
        setDocuments((prev) => prev.map((d) => (d.id === editingDoc.id ? editingDoc : d)))
        toast.error('Failed to update document')
      }
    })
  }

  const handleDelete = async () => {
    if (!deletingDoc) return

    setDocuments((prev) => prev.filter((d) => d.id !== deletingDoc.id))
    setDeletingDoc(null)

    startTransition(async () => {
      try {
        await deleteComplianceDocument(deletingDoc.id)
        toast.success('Document deleted successfully')
        queryClient.invalidateQueries({ queryKey: ['compliance-documents', driverId] })
        queryClient.invalidateQueries({ queryKey: ['compliance-overview'] })
        queryClient.invalidateQueries({ queryKey: ['audit-logs'] })
        // Invalidate alert-related queries to update notification badge
        queryClient.invalidateQueries({ queryKey: ['compliance-alert-count'] })
        queryClient.invalidateQueries({ queryKey: ['compliance-expiring-documents'] })
        queryClient.invalidateQueries({ queryKey: ['compliance-summary'] })
        queryClient.invalidateQueries({ queryKey: ['compliance-drivers'] })
      } catch (error) {
        setDocuments((prev) => [...prev, deletingDoc])
        toast.error('Failed to delete document')
      }
    })
  }

  const getStatusBadge = (expiresAt: Date | string) => {
    const status = getComplianceStatus(expiresAt)
    
    switch (status) {
      case 'expired':
        return (
          <Badge variant="danger" className="gap-1">
            <XCircle className="h-3 w-3" />
            Expired
          </Badge>
        )
      case 'expiring':
        return (
          <Badge variant="warning" className="gap-1">
            <AlertTriangle className="h-3 w-3" />
            Expiring Soon
          </Badge>
        )
      case 'valid':
        return (
          <Badge variant="success" className="gap-1">
            <CheckCircle className="h-3 w-3" />
            Valid
          </Badge>
        )
    }
  }

  if (documents.length === 0) {
    return (
      <EmptyState
        icon={<div className="text-6xl">📋</div>}
        title="No compliance documents"
        description="Add compliance documents to track driver certifications and licenses."
      />
    )
  }

  return (
    <>
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Document Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Issued Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Expiry Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {documents.map((doc) => {
                const status = getComplianceStatus(doc.expiresAt)
                return (
                  <tr
                    key={doc.id}
                    className={
                      status === 'expired'
                        ? 'bg-red-50'
                        : status === 'expiring'
                        ? 'bg-yellow-50'
                        : ''
                    }
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-slate-900">{doc.docType}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-slate-500">{formatDate(doc.issuedAt)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-slate-900">{formatDate(doc.expiresAt)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(doc.expiresAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          onClick={() => setEditingDoc(doc)}
                          variant="ghost"
                          size="sm"
                          className="text-slate-700"
                        >
                          <Pencil className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                        <Button
                          onClick={() => setDeletingDoc(doc)}
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {editingDoc && (
        <EditComplianceDocumentModal
          document={editingDoc}
          onClose={() => setEditingDoc(null)}
          onSave={handleUpdate}
        />
      )}

      {deletingDoc && (
        <DeleteConfirmDialog
          title="Delete Document"
          description={`Are you sure you want to delete this ${deletingDoc.docType} document?`}
          onConfirm={handleDelete}
          onCancel={() => setDeletingDoc(null)}
        />
      )}
    </>
  )
}
