import { PaymentsPageClient } from './payments-page-client'

export default async function PaymentsPage() {
  return (
    <>
      <div className="mb-4 sm:mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">Payments</h1>
        <p className="text-sm sm:text-base text-slate-600 mt-1">Manage invoices, payments, and outstanding balances</p>
      </div>

      <PaymentsPageClient />
    </>
  )
}
