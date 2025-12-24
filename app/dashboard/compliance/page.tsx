import { Suspense } from 'react'
import { PrismaClient } from '@prisma/client'
import { withTenantContext, getTenantContext } from '@/lib/withTenantContext'
import { ComplianceOverviewTable } from '@/components/ComplianceOverviewTable'
import { TableSkeleton } from '@/components/ui/skeleton'

async function getAllComplianceDocuments() {
  const context = await getTenantContext()

  return await withTenantContext(context, async (tx) => {
    // DATABASE-LEVEL: Using view for true database-enforced tenant isolation
    const docs = await tx.$queryRaw<Array<{
      id: string
      tenant_id: string
      driver_id: string
      doc_type: string
      issued_at: Date | null
      expires_at: Date
      file_url: string | null
      deleted_at: Date | null
      deleted_by: string | null
      created_at: Date
      updated_at: Date
    }>>`
      SELECT * FROM app.v_driver_compliance_documents
      ORDER BY expires_at ASC
    `
    
    // Fetch drivers separately (view doesn't include relations)
    const driverIds = [...new Set(docs.map(d => d.driver_id))]
    const drivers = driverIds.length > 0 ? await tx.driver.findMany({
      where: { id: { in: driverIds }, tenantId: context.tenantId, deletedAt: null }
    }) : []
    const driverMap = new Map(drivers.map(d => [d.id, d]))
    
    return docs
      .map(d => {
        const driver = driverMap.get(d.driver_id)
        if (!driver) return null // Filter out documents without drivers
        return {
          id: d.id,
          tenantId: d.tenant_id,
          driverId: d.driver_id,
          docType: d.doc_type,
          issuedAt: d.issued_at,
          expiresAt: d.expires_at,
          fileUrl: d.file_url,
          deletedAt: d.deleted_at,
          deletedBy: d.deleted_by,
          createdAt: d.created_at,
          updatedAt: d.updated_at,
          driver
        }
      })
      .filter((doc): doc is NonNullable<typeof doc> => doc !== null)
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
