'use client'

import { AlertTriangle } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface DeleteConfirmDialogProps {
  title: string
  description: string
  onConfirm: () => void
  onCancel: () => void
}

export function DeleteConfirmDialog({
  title,
  description,
  onConfirm,
  onCancel,
}: DeleteConfirmDialogProps) {
  return (
    <Dialog open={true} onOpenChange={onCancel}>
      <DialogContent onClose={onCancel}>
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <DialogTitle>{title}</DialogTitle>
            </div>
          </div>
          <DialogDescription className="pt-3">{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="button" variant="destructive" onClick={onConfirm}>
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
