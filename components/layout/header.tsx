'use client'

import { useState } from 'react'
import { Menu, LogOut, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { logoutAction } from '@/lib/auth/actions'
import { useRouter } from 'next/navigation'

interface SidebarProps {
  isCollapsed: boolean
  onToggle: () => void
  children: React.ReactNode
}

export function Sidebar({ isCollapsed, onToggle, children }: SidebarProps) {
  return (
    <>
      {/* Mobile overlay */}
      {!isCollapsed && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onToggle}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-16 bottom-0 z-40 bg-white border-r border-slate-200 transition-all duration-300 overflow-y-auto',
          isCollapsed ? '-translate-x-full lg:translate-x-0 lg:w-16' : 'w-64'
        )}
      >
        <nav className="p-4 space-y-1">{children}</nav>
      </aside>

      {/* Spacer for desktop */}
      <div
        className={cn(
          'hidden lg:block transition-all duration-300 flex-shrink-0',
          isCollapsed ? 'w-16' : 'w-64'
        )}
      />
    </>
  )
}

interface TopBarProps {
  tenantName: string
  userEmail: string
  tenantId: string
  onMenuClick: () => void
}

export function TopBar({ tenantName, userEmail, tenantId, onMenuClick }: TopBarProps) {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const router = useRouter()

  async function handleLogout() {
    await logoutAction()
  }

  function handleSwitchTenant() {
    router.push('/select-tenant')
  }

  return (
    <header className="fixed top-0 left-0 right-0 h-16 bg-white border-b border-slate-200 z-50">
      <div className="flex items-center justify-between h-full px-4">
        {/* Left side */}
        <div className="flex items-center gap-4">
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 rounded-lg hover:bg-slate-100 transition-colors"
            aria-label="Toggle menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          
          <div className="flex items-center gap-3">
            <div className="hidden lg:flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-white font-bold text-sm">
              {tenantName.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-lg font-semibold text-slate-900">{tenantName}</h1>
              <p className="text-xs text-slate-500 hidden sm:block">School Transportation Management</p>
            </div>
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2">
          {/* Tenant switcher */}
          <button 
            onClick={handleSwitchTenant}
            className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors"
            title="Switch organization"
          >
            <RefreshCw className="h-4 w-4" />
          </button>

          {/* User menu */}
          <div className="relative">
            <button
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <div className="h-8 w-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-sm font-semibold">
                {userEmail[0]?.toUpperCase() || 'U'}
              </div>
              <span className="hidden sm:inline max-w-[150px] truncate">{userEmail}</span>
            </button>

            {/* User dropdown */}
            {isUserMenuOpen && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setIsUserMenuOpen(false)}
                />
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-50">
                  <div className="px-4 py-2 border-b border-slate-200">
                    <p className="text-xs text-slate-500">Signed in as</p>
                    <p className="text-sm font-medium text-slate-900 truncate">{userEmail}</p>
                  </div>
                  <button 
                    onClick={handleSwitchTenant}
                    className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 flex items-center gap-2"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Switch Organization
                  </button>
                  <button 
                    onClick={handleLogout}
                    className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign out
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
