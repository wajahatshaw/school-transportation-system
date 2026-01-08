'use client'

import { CheckCircle, XCircle, AlertTriangle, TrendingUp } from 'lucide-react'

interface ComplianceSummary {
  tenantId: string
  totalDrivers: number
  compliantDrivers: number
  nonCompliantDrivers: number
  compliancePercentage: number
  expiredCount: number
  expiringCount: number
  missingCount: number
  topIssues: Array<{ docType: string; count: number }>
}

interface ComplianceSummaryCardsProps {
  summary: ComplianceSummary
}

export function ComplianceSummaryCards({ summary }: ComplianceSummaryCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {/* Overall Compliance */}
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
            <TrendingUp className="h-6 w-6 text-slate-900" />
          </div>
          <div>
            <p className="text-sm text-slate-600">Compliance Rate</p>
            <p className="text-2xl font-bold text-slate-900">{summary.compliancePercentage}%</p>
            <p className="text-xs text-slate-500">
              {summary.compliantDrivers} of {summary.totalDrivers} drivers
            </p>
          </div>
        </div>
      </div>
      
      {/* Expired Documents */}
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
            <XCircle className="h-6 w-6 text-slate-900" />
          </div>
          <div>
            <p className="text-sm text-slate-600">Expired Documents</p>
            <p className="text-2xl font-bold text-slate-900">{summary.expiredCount}</p>
            <p className="text-xs text-slate-500">Requires immediate action</p>
          </div>
        </div>
      </div>
      
      {/* Expiring Soon */}
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
            <AlertTriangle className="h-6 w-6 text-slate-900" />
          </div>
          <div>
            <p className="text-sm text-slate-600">Expiring Soon</p>
            <p className="text-2xl font-bold text-slate-900">{summary.expiringCount}</p>
            <p className="text-xs text-slate-500">Within 30 days</p>
          </div>
        </div>
      </div>
      
      {/* Missing Documents */}
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
            <AlertTriangle className="h-6 w-6 text-slate-900" />
          </div>
          <div>
            <p className="text-sm text-slate-600">Missing Documents</p>
            <p className="text-2xl font-bold text-slate-900">{summary.missingCount}</p>
            <p className="text-xs text-slate-500">Required docs not uploaded</p>
          </div>
        </div>
      </div>
      
      {/* Top Issues */}
      {summary.topIssues.length > 0 && (
        <div className="md:col-span-4 bg-white rounded-lg border border-slate-200 p-6">
          <h3 className="text-sm font-semibold text-slate-900 mb-3">Top Compliance Issues</h3>
          <div className="flex flex-wrap gap-2">
            {summary.topIssues.slice(0, 5).map((issue) => (
              <div
                key={issue.docType}
                className="px-3 py-1 bg-slate-100 text-slate-900 rounded-md text-sm font-medium"
              >
                {issue.docType}: {issue.count} drivers
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

