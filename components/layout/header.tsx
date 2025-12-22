'use client'

import { useState } from 'react'
import { Menu, X, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

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
          'fixed left-0 top-16 bottom-0 z-40 bg-white border-r border-slate-200 transition-all duration-300',
          isCollapsed ? '-translate-x-full lg:translate-x-0 lg:w-16' : 'w-64'
        )}
      >
        <nav className="p-4 space-y-1">{children}</nav>
      </aside>

      {/* Spacer for desktop */}
      <div
        className={cn(
          'hidden lg:block transition-all duration-300',
          isCollapsed ? 'w-16' : 'w-64'
        )}
      />
    </>
  )
}

interface TopBarProps {
  tenantName: string
  userName?: string
  onMenuClick: () => void
}

export function TopBar({ tenantName, userName, onMenuClick }: TopBarProps) {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)

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
          {/* Tenant switcher placeholder */}
          <button className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors">
            <span>Switch Tenant</span>
            <ChevronDown className="h-4 w-4" />
          </button>

          {/* User menu */}
          <div className="relative">
            <button
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <div className="h-8 w-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-sm font-semibold">
                {userName?.[0]?.toUpperCase() || 'U'}
              </div>
              <span className="hidden sm:inline">{userName || 'User'}</span>
            </button>

            {/* User dropdown - placeholder */}
            {isUserMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-slate-200 py-1">
                <button className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-100">
                  Settings
                </button>
                <button className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-100">
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
