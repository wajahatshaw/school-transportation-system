'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useTransition } from 'react'
import { cn } from '@/lib/utils'

interface InstantNavLinkProps {
  href: string
  children: React.ReactNode
  className?: string
}

/**
 * A navigation link that uses startTransition to keep the old UI visible
 * while the new page loads, preventing loading flashes
 */
export function InstantNavLink({ href, children, className }: InstantNavLinkProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  
  // Parse the href to get path and query
  const [hrefPath, hrefQueryString] = href.split('?')
  const hrefParams = new URLSearchParams(hrefQueryString || '')
  
  // Build current URL with query params
  const currentQueryString = searchParams.toString()
  const currentFullUrl = currentQueryString ? `${pathname}?${currentQueryString}` : pathname
  
  // For links with query params (like ?tab=trips), check exact match
  // For regular links, check path match
  let isActive = false
  
  if (hrefQueryString) {
    // Has query params - must match exact URL OR be on a child route
    isActive = currentFullUrl === href || 
               (pathname.startsWith(hrefPath) && pathname !== hrefPath)
    
    // Special handling for /dashboard/operations?tab=attendance
    // Should stay active when on /dashboard/attendance/[tripId]
    if (hrefPath === '/dashboard/operations' && hrefParams.get('tab') === 'attendance') {
      isActive = isActive || pathname.startsWith('/dashboard/attendance')
    }
    
    // Special handling for /dashboard/operations?tab=trips
    // Should stay active when on /dashboard/my-trips/[tripId]
    if (hrefPath === '/dashboard/operations' && hrefParams.get('tab') === 'trips') {
      isActive = isActive || pathname.startsWith('/dashboard/my-trips')
    }
  } else {
    // No query params - check path
    isActive = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
  }

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    
    // Use startTransition to keep the current UI visible while navigating
    // This prevents the white flash/loading screen
    startTransition(() => {
      router.push(href)
    })
  }

  return (
    <a
      href={href}
      onClick={handleClick}
      className={cn(
        'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all',
        isActive
          ? 'bg-slate-900 text-white'
          : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900',
        isPending && 'opacity-70 pointer-events-none',
        className
      )}
    >
      {children}
    </a>
  )
}

