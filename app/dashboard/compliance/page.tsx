import { Suspense } from 'react'
import { PrismaClient } from '@prisma/client'
import { withTenantContext, getTenantContext } from '@/lib/withTenantContext'
import { ComplianceOverviewTable } from '@/components/ComplianceOverviewTable'
import { TableSkeleton } from '@/components/ui/skeleton'

async function getAllComplianceDocuments() {
  const context = await getTenantContext()

  return await withTenantContext(context, async (tx) => {
    return await tx.driverComplianceDocument.findMany({
      include: {
        driver: true,
      },
      orderBy: { expiresAt: 'asc' },
    })
  })
}

export default async function CompliancePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Compliance Overview</h1>
        <p className="text-slate-600 mt-1">Monitor driver compliance documents and expiration dates</p>
      </div>

      <Suspense fallback={<TableSkeleton />}>
        <ComplianceTableWrapper />
      </Suspense>
    </div>
  )
}

async function ComplianceTableWrapper() {
  const documents = await getAllComplianceDocuments()
  return <ComplianceOverviewTable documents={documents} />
}
