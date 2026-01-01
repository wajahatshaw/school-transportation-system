'use client'

import { useQuery } from '@tanstack/react-query'
import { getComplianceDocuments } from '@/lib/actions'
import { ComplianceDocumentsTable } from '@/components/ComplianceDocumentsTable'
import { TableSkeleton } from '@/components/ui/skeleton'

export function ComplianceDocumentsClient({ driverId }: { driverId: string }) {
  const docsQuery = useQuery({
    queryKey: ['compliance-documents', driverId],
    queryFn: () => getComplianceDocuments(driverId),
  })

  if (docsQuery.isLoading && !docsQuery.data) return <TableSkeleton rows={3} />

  return <ComplianceDocumentsTable documents={docsQuery.data ?? []} driverId={driverId} />
}


