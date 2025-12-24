'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { autoSelectTenantAction } from '@/lib/auth/actions'

interface AutoSelectTenantProps {
  tenantId: string
}

export default function AutoSelectTenant({ tenantId }: AutoSelectTenantProps) {
  const router = useRouter()
  const [error, setError] = useState('')

  useEffect(() => {
    async function selectTenant() {
      try {
        const result = await autoSelectTenantAction(tenantId)
        if (result?.error) {
          setError(result.error)
        } else {
          // Redirect to dashboard on success
          router.push('/dashboard')
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to select tenant')
      }
    }

    selectTenant()
  }, [tenantId, router])

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              Error
            </h2>
            <p className="mt-2 text-center text-sm text-red-600">
              {error}
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Setting up your workspace...
          </h2>
          <div className="mt-8 flex justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
          </div>
        </div>
      </div>
    </div>
  )
}

