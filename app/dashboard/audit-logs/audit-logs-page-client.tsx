'use client'

import { useQuery } from '@tanstack/react-query'
import { getAuditLogs } from '@/lib/actions'
import { AuditLogsTable } from '@/components/AuditLogsTable'
import { TableSkeleton } from '@/components/ui/skeleton'

export function AuditLogsPageClient() {
  const logsQuery = useQuery({
    queryKey: ['audit-logs'],
    queryFn: () => getAuditLogs(),
  })

  if (logsQuery.isLoading && !logsQuery.data) return <TableSkeleton />

  return <AuditLogsTable logs={logsQuery.data ?? []} />
}


