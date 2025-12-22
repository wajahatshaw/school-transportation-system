import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { getDriverById, getComplianceDocuments } from '@/lib/actions'
import { ComplianceDocumentsTable } from '@/components/ComplianceDocumentsTable'
import { AddComplianceDocumentButton } from '@/components/AddComplianceDocumentButton'
import { Button } from '@/components/ui/button'
import { TableSkeleton } from '@/components/ui/skeleton'

export default async function DriverCompliancePage({
  params,
}: {
  params: Promise<{ driverId: string }>
}) {
  const { driverId } = await params
  const driver = await getDriverById(driverId)

  if (!driver) {
    notFound()
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/dashboard/drivers">
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Drivers
          </Button>
        </Link>

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              {driver.firstName} {driver.lastName}
            </h1>
            <p className="text-slate-600 mt-1">
              License: {driver.licenseNumber || 'N/A'}
            </p>
          </div>
          <AddComplianceDocumentButton driverId={driverId} />
        </div>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Driver Information</h2>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <dt className="text-sm font-medium text-slate-500">First Name</dt>
            <dd className="mt-1 text-sm text-slate-900">{driver.firstName}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-slate-500">Last Name</dt>
            <dd className="mt-1 text-sm text-slate-900">{driver.lastName}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-slate-500">License Number</dt>
            <dd className="mt-1 text-sm text-slate-900">{driver.licenseNumber || 'N/A'}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-slate-500">Status</dt>
            <dd className="mt-1 text-sm text-slate-900">{driver.isDeleted ? 'Deleted' : 'Active'}</dd>
          </div>
        </dl>
      </div>

      <div>
        <h2 className="text-xl font-semibold text-slate-900 mb-4">Compliance Documents</h2>
        <Suspense fallback={<TableSkeleton rows={3} />}>
          <ComplianceDocumentsTableWrapper driverId={driverId} />
        </Suspense>
      </div>
    </div>
  )
}

async function ComplianceDocumentsTableWrapper({ driverId }: { driverId: string }) {
  const documents = await getComplianceDocuments(driverId)
  return <ComplianceDocumentsTable documents={documents} driverId={driverId} />
}
