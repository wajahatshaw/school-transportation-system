'use client'

import { useQuery } from '@tanstack/react-query'
import { getComplianceOverviewDocuments } from '@/lib/actions'
import { ComplianceOverviewTable } from '@/components/ComplianceOverviewTable'
import { TableSkeleton } from '@/components/ui/skeleton'

export function CompliancePageClient() {
  const docsQuery = useQuery({
    queryKey: ['compliance-overview'],
    queryFn: () => getComplianceOverviewDocuments(),
  })

  if (docsQuery.isLoading && !docsQuery.data) return <TableSkeleton />

  return <ComplianceOverviewTable documents={docsQuery.data ?? []} />
}


