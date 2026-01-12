'use client'

import React, { useState, useMemo, useEffect } from 'react'
import { AuditLog } from '@prisma/client'
import { ChevronDown, ChevronRight, Activity } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { Pagination } from '@/components/ui/pagination'
import { formatDateTime } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface AuditLogsTableProps {
  logs: AuditLog[]
}

export function AuditLogsTable({ logs }: AuditLogsTableProps) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)

  const paginatedLogs = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    return logs.slice(startIndex, endIndex)
  }, [logs, currentPage, itemsPerPage])

  const totalPages = Math.ceil(logs.length / itemsPerPage)

  // Reset to page 1 when logs list changes
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1)
    } else if (logs.length > 0 && currentPage < 1) {
      setCurrentPage(1)
    }
  }, [logs.length, totalPages, currentPage])

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
      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="w-6 sm:w-8 px-2 sm:px-4 py-2 sm:py-3"></th>
              <th className="px-3 sm:px-4 lg:px-6 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-slate-500 uppercase tracking-wider">
                Timestamp
              </th>
              <th className="px-3 sm:px-4 lg:px-6 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-slate-500 uppercase tracking-wider">
                Action
              </th>
              <th className="px-3 sm:px-4 lg:px-6 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-slate-500 uppercase tracking-wider">
                Table
              </th>
              <th className="px-3 sm:px-4 lg:px-6 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-slate-500 uppercase tracking-wider">
                Record ID
              </th>
              <th className="px-3 sm:px-4 lg:px-6 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-slate-500 uppercase tracking-wider">
                User
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-200">
            {paginatedLogs.map((log) => {
              const isExpanded = expandedRows.has(log.id)
              return (
                <React.Fragment key={log.id}>
                  <tr
                    className="hover:bg-slate-50 cursor-pointer transition-colors"
                    onClick={() => toggleRow(log.id)}
                  >
                    <td className="px-2 sm:px-4 py-3 sm:py-4">
                      {isExpanded ? (
                        <ChevronDown className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-slate-500" />
                      ) : (
                        <ChevronRight className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-slate-500" />
                      )}
                    </td>
                    <td className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 whitespace-nowrap">
                      <div className="text-xs sm:text-sm text-slate-900">{formatDateTime(log.createdAt)}</div>
                    </td>
                    <td className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 whitespace-nowrap">
                      <div className="scale-90 sm:scale-100 origin-left">
                        {getActionBadge(log.action)}
                      </div>
                    </td>
                    <td className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 whitespace-nowrap">
                      <div className="text-xs sm:text-sm text-slate-900 font-mono">{log.tableName}</div>
                    </td>
                    <td className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 whitespace-nowrap">
                      <div className="text-[10px] sm:text-xs text-slate-500 font-mono">
                        {log.recordId.slice(0, 8)}...
                      </div>
                    </td>
                    <td className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 whitespace-nowrap">
                      <div className="text-xs sm:text-sm text-slate-500">
                        {log.userId ? log.userId.slice(0, 8) + '...' : 'System'}
                      </div>
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr key={`${log.id}-expanded`}>
                      <td colSpan={6} className="px-2 sm:px-4 py-3 sm:py-4 bg-slate-50">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 px-3 sm:px-4 lg:px-6">
                          {/* Before */}
                          {log.before && (
                            <div>
                              <h4 className="text-xs sm:text-sm font-semibold text-slate-900 mb-1.5 sm:mb-2">
                                Before
                              </h4>
                              <pre className="bg-white border border-slate-200 rounded-lg p-2 sm:p-3 lg:p-4 text-[10px] sm:text-xs overflow-x-auto font-mono text-slate-700">
                                {formatJSON(log.before)}
                              </pre>
                            </div>
                          )}

                          {/* After */}
                          {log.after && (
                            <div>
                              <h4 className="text-xs sm:text-sm font-semibold text-slate-900 mb-1.5 sm:mb-2">After</h4>
                              <pre className="bg-white border border-slate-200 rounded-lg p-2 sm:p-3 lg:p-4 text-[10px] sm:text-xs overflow-x-auto font-mono text-slate-700">
                                {formatJSON(log.after)}
                              </pre>
                            </div>
                          )}

                          {/* Metadata */}
                          <div className={cn(log.before && log.after ? 'lg:col-span-2' : '')}>
                            <h4 className="text-xs sm:text-sm font-semibold text-slate-900 mb-1.5 sm:mb-2">
                              Metadata
                            </h4>
                            <dl className="bg-white border border-slate-200 rounded-lg p-2 sm:p-3 lg:p-4 space-y-1.5 sm:space-y-2">
                              <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-0">
                                <dt className="text-[10px] sm:text-xs font-medium text-slate-500">Record ID:</dt>
                                <dd className="text-[10px] sm:text-xs font-mono text-slate-900 break-all">{log.recordId}</dd>
                              </div>
                              {log.userId && (
                                <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-0">
                                  <dt className="text-[10px] sm:text-xs font-medium text-slate-500">User ID:</dt>
                                  <dd className="text-[10px] sm:text-xs font-mono text-slate-900 break-all">{log.userId}</dd>
                                </div>
                              )}
                              {log.ip && (
                                <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-0">
                                  <dt className="text-[10px] sm:text-xs font-medium text-slate-500">IP Address:</dt>
                                  <dd className="text-[10px] sm:text-xs font-mono text-slate-900 break-all">{log.ip}</dd>
                                </div>
                              )}
                            </dl>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-3 p-3 sm:p-4">
        {paginatedLogs.map((log) => {
          const isExpanded = expandedRows.has(log.id)
          return (
            <div
              key={log.id}
              className="bg-slate-50 border border-slate-200 rounded-lg overflow-hidden"
            >
              <button
                onClick={() => toggleRow(log.id)}
                className="w-full text-left p-3 hover:bg-slate-100 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-slate-500 flex-shrink-0" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-slate-500 flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="scale-90 origin-left">
                          {getActionBadge(log.action)}
                        </div>
                        <span className="text-xs text-slate-500 font-mono truncate">
                          {log.tableName}
                        </span>
                      </div>
                      <div className="text-xs text-slate-600">
                        {formatDateTime(log.createdAt)}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mt-2 text-[10px] text-slate-500 font-mono">
                  ID: {log.recordId.slice(0, 12)}...
                </div>
              </button>
              {isExpanded && (
                <div className="p-3 bg-white border-t border-slate-200 space-y-3">
                  {log.before && (
                    <div>
                      <h4 className="text-xs font-semibold text-slate-900 mb-1.5">Before</h4>
                      <pre className="bg-slate-50 border border-slate-200 rounded p-2 text-[10px] overflow-x-auto font-mono text-slate-700">
                        {formatJSON(log.before)}
                      </pre>
                    </div>
                  )}
                  {log.after && (
                    <div>
                      <h4 className="text-xs font-semibold text-slate-900 mb-1.5">After</h4>
                      <pre className="bg-slate-50 border border-slate-200 rounded p-2 text-[10px] overflow-x-auto font-mono text-slate-700">
                        {formatJSON(log.after)}
                      </pre>
                    </div>
                  )}
                  <div>
                    <h4 className="text-xs font-semibold text-slate-900 mb-1.5">Metadata</h4>
                    <dl className="bg-slate-50 border border-slate-200 rounded p-2 space-y-1.5">
                      <div>
                        <dt className="text-[10px] font-medium text-slate-500">Record ID:</dt>
                        <dd className="text-[10px] font-mono text-slate-900 break-all">{log.recordId}</dd>
                      </div>
                      {log.userId && (
                        <div>
                          <dt className="text-[10px] font-medium text-slate-500">User ID:</dt>
                          <dd className="text-[10px] font-mono text-slate-900 break-all">{log.userId}</dd>
                        </div>
                      )}
                      {log.ip && (
                        <div>
                          <dt className="text-[10px] font-medium text-slate-500">IP Address:</dt>
                          <dd className="text-[10px] font-mono text-slate-900 break-all">{log.ip}</dd>
                        </div>
                      )}
                    </dl>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Pagination */}
      {logs.length > 0 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          itemsPerPage={itemsPerPage}
          totalItems={logs.length}
          onItemsPerPageChange={setItemsPerPage}
        />
      )}
    </div>
  )
}
