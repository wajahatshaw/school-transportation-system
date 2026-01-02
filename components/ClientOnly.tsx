'use client'

import { useEffect, useState } from 'react'

/**
 * Prevents hydration mismatches by only rendering children on the client
 * Use this to wrap components that should never show during SSR
 */
export function ClientOnly({ children, fallback = null }: { children: React.ReactNode; fallback?: React.ReactNode }) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return <>{fallback}</>
  }

  return <>{children}</>
}

