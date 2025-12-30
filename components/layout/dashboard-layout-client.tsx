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
  Settings as SettingsIcon
} from 'lucide-react'
import { NavLink } from '@/components/NavLink'
import { Sidebar, TopBar } from '@/components/layout/header'
import { ToastProvider } from '@/components/ui/toast'

interface DashboardLayoutClientProps {
  children: React.ReactNode
  tenantName: string
  userEmail: string
  tenantId: string
}

export function DashboardLayoutClient({ children, tenantName, userEmail, tenantId }: DashboardLayoutClientProps) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)

  const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/dashboard/students', label: 'Students', icon: GraduationCap },
    { href: '/dashboard/drivers', label: 'Drivers', icon: Car },
    { href: '/dashboard/vehicles', label: 'Vehicles', icon: Bus },
    { href: '/dashboard/routes', label: 'Routes', icon: MapPin },
    { href: '/dashboard/my-trips', label: 'My Trips', icon: Route },
    { href: '/dashboard/attendance', label: 'Attendance', icon: ClipboardCheck },
    { href: '/dashboard/compliance', label: 'Compliance', icon: FileCheck },
    { href: '/dashboard/audit-logs', label: 'Audit Logs', icon: ScrollText },
    { href: '/dashboard/settings', label: 'Settings', icon: SettingsIcon },
  ]

  return (
    <>
      <ToastProvider />
      <div className="min-h-screen bg-slate-50">
        <TopBar
          tenantName={tenantName}
          userEmail={userEmail}
          tenantId={tenantId}
          onMenuClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        />

        <div className="pt-16 flex">
          <Sidebar
            isCollapsed={isSidebarCollapsed}
            onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          >
            {navItems.map((item) => {
              const Icon = item.icon
              return (
                <NavLink key={item.href} href={item.href}>
                  <Icon className="h-5 w-5 flex-shrink-0" />
                  {!isSidebarCollapsed && <span>{item.label}</span>}
                </NavLink>
              )
            })}
          </Sidebar>

          <main className="flex-1 p-6 lg:p-8">
            <div className="max-w-7xl mx-auto">{children}</div>
          </main>
        </div>
      </div>
    </>
  )
}
