import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function DriverLandingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12">
      <div className="max-w-lg w-full rounded-xl border bg-white p-8">
        <h1 className="text-2xl font-bold text-slate-900">Driver account ready</h1>
        <p className="mt-2 text-slate-600">
          Your password has been set and you’re signed in.
        </p>
        <p className="mt-4 text-sm text-slate-600">
          Driver dashboard access will be enabled soon. If you believe this is an error,
          please contact your administrator.
        </p>
      </div>
    </div>
  )
}


