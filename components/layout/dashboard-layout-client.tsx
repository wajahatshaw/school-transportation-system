'use client'

import { useState } from 'react'
import { 
  LayoutDashboard, 
  GraduationCap, 
  Car, 
  Bus,
  MapPin,
  ClipboardCheck,
  Route,
  FileCheck, 
  ScrollText,
  Settings as SettingsIcon,
  CreditCard
} from 'lucide-react'
import { InstantNavLink } from '@/components/InstantNavLink'
import { Sidebar, TopBar } from '@/components/layout/header'
import { ToastProvider } from '@/components/ui/toast'
import { ReactQueryProvider } from '@/lib/react-query/provider'
import { DataPrefetcher } from '@/components/DataPrefetcher'

interface DashboardLayoutClientProps {
  children: React.ReactNode
  tenantName: string
  userEmail: string
  tenantId: string
  role: string
}

export function DashboardLayoutClient({ children, tenantName, userEmail, tenantId, role }: DashboardLayoutClientProps) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)

  const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/dashboard/students', label: 'Students', icon: GraduationCap },
    { href: '/dashboard/drivers', label: 'Drivers', icon: Car },
    { href: '/dashboard/vehicles', label: 'Vehicles', icon: Bus },
    { href: '/dashboard/routes', label: 'Routes', icon: MapPin },
    { href: '/dashboard/operations?tab=trips', label: 'Trips', icon: Route },
    { href: '/dashboard/operations?tab=attendance', label: 'Attendance', icon: ClipboardCheck },
    { href: '/dashboard/compliance', label: 'Compliance', icon: FileCheck },
    { href: '/dashboard/payments', label: 'Payments', icon: CreditCard },
    { href: '/dashboard/audit-logs', label: 'Audit Logs', icon: ScrollText },
    { href: '/dashboard/settings', label: 'Settings', icon: SettingsIcon },
  ]

  const visibleNavItems =
    role === 'driver'
      ? [{ href: '/dashboard/operations?tab=attendance', label: 'Attendance', icon: ClipboardCheck }]
      : navItems

  return (
    <ReactQueryProvider>
      <DataPrefetcher role={role} />
      <ToastProvider />
      <div className="min-h-screen bg-slate-50">
        <TopBar
          tenantName={tenantName}
          userEmail={userEmail}
          tenantId={tenantId}
          onMenuClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        />

        <div className="pt-16 flex min-h-[calc(100vh-4rem)]">
          <Sidebar
            isCollapsed={isSidebarCollapsed}
            onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          >
            {visibleNavItems.map((item) => {
              const Icon = item.icon
              return (
                <InstantNavLink key={item.href} href={item.href}>
                  <Icon className="h-5 w-5 flex-shrink-0" />
                  {!isSidebarCollapsed && <span>{item.label}</span>}
                </InstantNavLink>
              )
            })}
          </Sidebar>

          <main className="flex-1 p-4 sm:p-6 lg:p-8 w-full min-w-0 overflow-x-hidden">
            <div className="max-w-7xl mx-auto w-full">{children}</div>
          </main>
        </div>
      </div>
    </ReactQueryProvider>
  )
}
