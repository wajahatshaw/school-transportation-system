'use client'

import * as React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // AGGRESSIVE caching - data NEVER goes stale
        staleTime: Infinity,
        // Keep cache for 30 minutes (was 10)
        gcTime: 1000 * 60 * 30,
        // NEVER refetch automatically
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        refetchOnMount: false,
        // Even if component remounts, don't refetch
        refetchInterval: false,
        refetchIntervalInBackground: false,
        retry: 1,
        // Persist cache across remounts
        networkMode: 'online',
      },
    },
  })
}

let browserQueryClient: QueryClient | undefined

export function ReactQueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = React.useState(() => {
    if (typeof window === 'undefined') return makeQueryClient()
    // CRITICAL: Reuse the same client instance across ALL remounts
    if (!browserQueryClient) {
      browserQueryClient = makeQueryClient()
      console.log('🔥 React Query Client initialized - cache will persist!')
    } else {
      console.log('♻️ Reusing existing React Query Client - cache preserved!')
    }
    return browserQueryClient
  })

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}



