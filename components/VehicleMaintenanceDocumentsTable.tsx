'use client'

import { useState, useTransition, useEffect } from 'react'
import { Pencil, Trash2, CheckCircle, Clock, Image as ImageIcon, ExternalLink } from 'lucide-react'
import { updateVehicleMaintenanceDocument, deleteVehicleMaintenanceDocument } from '@/lib/actions'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { formatDate } from '@/lib/utils'
import { EditVehicleMaintenanceDocumentModal } from './EditVehicleMaintenanceDocumentModal'
import { DeleteConfirmDialog } from './DeleteConfirmDialog'

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

interface VehicleMaintenanceDocumentsTableProps {
  documents: VehicleMaintenanceDocument[]
  vehicleId: string
}

export function VehicleMaintenanceDocumentsTable({
  documents: initialDocuments,
  vehicleId,
}: VehicleMaintenanceDocumentsTableProps) {
  const [documents, setDocuments] = useState(initialDocuments)
  const [editingDoc, setEditingDoc] = useState<VehicleMaintenanceDocument | null>(null)
  const [deletingDoc, setDeletingDoc] = useState<VehicleMaintenanceDocument | null>(null)
  const [isPending, startTransition] = useTransition()

  // Sync state when props change (after router.refresh())
  useEffect(() => {
    setDocuments(initialDocuments)
  }, [initialDocuments])

  const handleUpdate = async (data: {
    maintenanceDocUrl?: string
    notes?: string
    scheduledDate?: Date
    maintenanceStatus?: string
    completedDate?: Date
  }) => {
    if (!editingDoc) return

    const updatedDoc = { ...editingDoc, ...data }
    setDocuments((prev) => prev.map((d) => (d.id === editingDoc.id ? updatedDoc : d)))
    setEditingDoc(null)

    startTransition(async () => {
      try {
        await updateVehicleMaintenanceDocument(editingDoc.id, data)
        toast.success('Maintenance document updated successfully')
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
        await deleteVehicleMaintenanceDocument(deletingDoc.id)
        toast.success('Maintenance document deleted successfully')
      } catch (error) {
        setDocuments((prev) => [...prev, deletingDoc])
        toast.error('Failed to delete document')
      }
    })
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <Badge variant="success" className="gap-1">
            <CheckCircle className="h-3 w-3" />
            Completed
          </Badge>
        )
      case 'pending':
        return (
          <Badge variant="warning" className="gap-1">
            <Clock className="h-3 w-3" />
            Pending
          </Badge>
        )
      default:
        return (
          <Badge variant="default" className="gap-1">
            {status}
          </Badge>
        )
    }
  }

  const isOverdue = (scheduledDate: Date | null, status: string) => {
    if (status === 'completed' || !scheduledDate) return false
    return new Date(scheduledDate) < new Date()
  }

  if (documents.length === 0) {
    return (
      <EmptyState
        icon={<div className="text-6xl">🔧</div>}
        title="No maintenance documents"
        description="Add maintenance documents to track vehicle maintenance records and schedules."
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
                  Document
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Scheduled Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Completed Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Notes
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {documents.map((doc) => {
                const overdue = isOverdue(doc.scheduledDate, doc.maintenanceStatus)
                return (
                  <tr
                    key={doc.id}
                    className={
                      overdue
                        ? 'bg-red-50'
                        : ''
                    }
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {doc.maintenanceDocUrl ? (
                          <>
                            <ImageIcon className="h-4 w-4 text-slate-400" />
                            <a
                              href={doc.maintenanceDocUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
                            >
                              View Document
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </>
                        ) : (
                          <span className="text-sm text-slate-500">No document</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-slate-900">
                        {formatDate(doc.scheduledDate)}
                      </div>
                      {overdue && (
                        <div className="text-xs text-red-600 mt-1">Overdue</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-slate-500">
                        {formatDate(doc.completedDate)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(doc.maintenanceStatus)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-slate-900 max-w-xs truncate">
                        {doc.notes || 'N/A'}
                      </div>
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
        <EditVehicleMaintenanceDocumentModal
          document={editingDoc}
          onClose={() => setEditingDoc(null)}
          onSave={handleUpdate}
        />
      )}

      {deletingDoc && (
        <DeleteConfirmDialog
          title="Delete Maintenance Document"
          description="Are you sure you want to delete this maintenance document?"
          onConfirm={handleDelete}
          onCancel={() => setDeletingDoc(null)}
        />
      )}
    </>
  )
}

