'use client'

import { useState } from 'react'
import { AuditLog } from '@prisma/client'
import { ChevronDown, ChevronRight, Activity } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { formatDateTime } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface AuditLogsTableProps {
  logs: AuditLog[]
}

export function AuditLogsTable({ logs }: AuditLogsTableProps) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())

  const toggleRow = (id: string) => {
    const newExpanded = new Set(expandedRows)
    if (newExpanded.has(id)) {
      newExpanded.delete(id)
    } else {
      newExpanded.add(id)
    }
    setExpandedRows(newExpanded)
  }

  const getActionBadge = (action: string) => {
    switch (action.toUpperCase()) {
      case 'INSERT':
        return <Badge variant="success">INSERT</Badge>
      case 'UPDATE':
        return <Badge variant="warning">UPDATE</Badge>
      case 'DELETE':
        return <Badge variant="danger">DELETE</Badge>
      default:
        return <Badge variant="secondary">{action}</Badge>
    }
  }

  const formatJSON = (data: any) => {
    if (!data) return 'null'
    try {
      return JSON.stringify(data, null, 2)
    } catch {
      return String(data)
    }
  }

  if (logs.length === 0) {
    return (
      <EmptyState
        icon={<Activity className="h-12 w-12" />}
        title="No audit logs"
        description="Audit logs will appear here when actions are performed in the system."
      />
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="w-8 px-4 py-3"></th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Timestamp
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Action
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Table
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Record ID
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                User
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-200">
            {logs.map((log) => {
              const isExpanded = expandedRows.has(log.id)
              return (
                <>
                  <tr
                    key={log.id}
                    className="hover:bg-slate-50 cursor-pointer transition-colors"
                    onClick={() => toggleRow(log.id)}
                  >
                    <td className="px-4 py-4">
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-slate-500" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-slate-500" />
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-slate-900">{formatDateTime(log.createdAt)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getActionBadge(log.action)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-slate-900 font-mono">{log.tableName}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-slate-500 font-mono text-xs">
                        {log.recordId.slice(0, 8)}...
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-slate-500">
                        {log.userId ? log.userId.slice(0, 8) + '...' : 'System'}
                      </div>
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr>
                      <td colSpan={6} className="px-4 py-4 bg-slate-50">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 px-6">
                          {/* Before */}
                          {log.before && (
                            <div>
                              <h4 className="text-sm font-semibold text-slate-900 mb-2">
                                Before
                              </h4>
                              <pre className="bg-white border border-slate-200 rounded-lg p-4 text-xs overflow-x-auto font-mono text-slate-700">
                                {formatJSON(log.before)}
                              </pre>
                            </div>
                          )}

                          {/* After */}
                          {log.after && (
                            <div>
                              <h4 className="text-sm font-semibold text-slate-900 mb-2">After</h4>
                              <pre className="bg-white border border-slate-200 rounded-lg p-4 text-xs overflow-x-auto font-mono text-slate-700">
                                {formatJSON(log.after)}
                              </pre>
                            </div>
                          )}

                          {/* Metadata */}
                          <div className={cn(log.before && log.after ? 'lg:col-span-2' : '')}>
                            <h4 className="text-sm font-semibold text-slate-900 mb-2">
                              Metadata
                            </h4>
                            <dl className="bg-white border border-slate-200 rounded-lg p-4 space-y-2">
                              <div className="flex justify-between">
                                <dt className="text-xs font-medium text-slate-500">Record ID:</dt>
                                <dd className="text-xs font-mono text-slate-900">{log.recordId}</dd>
                              </div>
                              {log.userId && (
                                <div className="flex justify-between">
                                  <dt className="text-xs font-medium text-slate-500">User ID:</dt>
                                  <dd className="text-xs font-mono text-slate-900">{log.userId}</dd>
                                </div>
                              )}
                              {log.ip && (
                                <div className="flex justify-between">
                                  <dt className="text-xs font-medium text-slate-500">IP Address:</dt>
                                  <dd className="text-xs font-mono text-slate-900">{log.ip}</dd>
                                </div>
                              )}
                            </dl>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
