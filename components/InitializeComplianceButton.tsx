'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Database } from 'lucide-react'

export function InitializeComplianceButton() {
  const queryClient = useQueryClient()
  const [isPending, startTransition] = useTransition()
  const [isInitialized, setIsInitialized] = useState(false)

  const handleInitialize = () => {
    startTransition(async () => {
      try {
        const response = await fetch('/api/compliance/initialize', {
          method: 'POST',
        })
        
        const data = await response.json()
        
        if (data.success) {
          toast.success('Compliance system initialized', {
            description: `Rules: ${data.data.rules.success ? '✓' : '✗'}, Alerts: ${data.data.alerts.sent || 0} created, Snapshots: ${data.data.snapshots.created || 0} created`
          })
          
          // Invalidate all compliance-related queries
          queryClient.invalidateQueries({ queryKey: ['compliance-rules'] })
          queryClient.invalidateQueries({ queryKey: ['compliance-alert-count'] })
          queryClient.invalidateQueries({ queryKey: ['compliance-summary'] })
          queryClient.invalidateQueries({ queryKey: ['compliance-drivers'] })
          queryClient.invalidateQueries({ queryKey: ['compliance-expiring-documents'] })
          
          setIsInitialized(true)
        } else {
          toast.error('Failed to initialize', {
            description: data.error || 'Unknown error occurred'
          })
        }
      } catch (error) {
        toast.error('Failed to initialize compliance system', {
          description: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    })
  }

  return (
    <Button
      onClick={handleInitialize}
      disabled={isPending || isInitialized}
      variant="outline"
      className="gap-2"
    >
      <Database className="h-4 w-4" />
      {isPending ? 'Initializing...' : isInitialized ? 'Initialized ✓' : 'Initialize Compliance System'}
    </Button>
  )
}

