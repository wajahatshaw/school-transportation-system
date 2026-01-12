import { PaymentsPageClient } from './payments-page-client'

export default async function PaymentsPage() {
  return (
    <>
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Payments</h1>
        <p className="text-slate-600 mt-1">Manage invoices, payments, and outstanding balances</p>
      </div>

      <PaymentsPageClient />
    </>
  )
}
