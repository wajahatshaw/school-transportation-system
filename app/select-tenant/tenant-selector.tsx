'use client'

import { useState } from 'react'
import { selectTenantAction } from '@/lib/auth/actions'
import { Button } from '@/components/ui/button'

interface Tenant {
  id: string
  name: string
  role: string
}

interface TenantSelectorProps {
  tenants: Tenant[]
  userEmail: string
}

export default function TenantSelector({ tenants, userEmail }: TenantSelectorProps) {
  const [selectedTenant, setSelectedTenant] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSelectTenant() {
    if (!selectedTenant) return

    setError('')
    setLoading(true)

    try {
      const result = await selectTenantAction(selectedTenant)
      if (result?.error) {
        setError(result.error)
        setLoading(false)
      }
      // If successful, selectTenantAction will redirect automatically
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to select organization')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Select Organization
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Logged in as {userEmail}
          </p>
        </div>

        <div className="mt-8 space-y-4">
          {tenants.map((tenant) => (
            <button
              key={tenant.id}
              onClick={() => setSelectedTenant(tenant.id)}
              disabled={loading}
              className={`
                w-full text-left p-4 border-2 rounded-lg transition-all
                ${
                  selectedTenant === tenant.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }
                ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">
                    {tenant.name}
                  </h3>
                  <p className="text-sm text-gray-500 capitalize">
                    Role: {tenant.role}
                  </p>
                </div>
                {selectedTenant === tenant.id && (
                  <div className="flex-shrink-0">
                    <svg
                      className="h-6 w-6 text-blue-500"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>

        {error && (
          <div className="rounded-md bg-red-50 p-4">
            <div className="flex">
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">{error}</h3>
              </div>
            </div>
          </div>
        )}

        <div>
          <Button
            onClick={handleSelectTenant}
            disabled={!selectedTenant || loading}
            className="w-full"
          >
            {loading ? 'Please wait...' : 'Continue'}
          </Button>
        </div>
      </div>
    </div>
  )
}

