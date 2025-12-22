import { Settings as SettingsIcon, Bell, Shield, Users, Database } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input, Label } from '@/components/ui/input'

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Settings</h1>
        <p className="text-slate-600 mt-1">Manage your account and organization settings</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="lg:col-span-1">
          <nav className="space-y-1">
            <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium bg-slate-100 text-slate-900">
              <SettingsIcon className="h-4 w-4" />
              General
            </button>
            <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50">
              <Users className="h-4 w-4" />
              Team Members
            </button>
            <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50">
              <Bell className="h-4 w-4" />
              Notifications
            </button>
            <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50">
              <Shield className="h-4 w-4" />
              Security
            </button>
            <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50">
              <Database className="h-4 w-4" />
              Data & Privacy
            </button>
          </nav>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3 space-y-6">
          {/* Organization Settings */}
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Organization Settings</h2>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="orgName">Organization Name</Label>
                <Input
                  id="orgName"
                  placeholder="Your Organization"
                  defaultValue="School Transportation Management"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="orgEmail">Contact Email</Label>
                <Input
                  id="orgEmail"
                  type="email"
                  placeholder="contact@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="timezone">Timezone</Label>
                <Input
                  id="timezone"
                  placeholder="UTC"
                  defaultValue="America/New_York"
                />
              </div>
              <div className="pt-4">
                <Button>Save Changes</Button>
              </div>
            </div>
          </div>

          {/* Appearance */}
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Appearance</h2>
            <div className="space-y-4">
              <div>
                <Label>Theme</Label>
                <div className="grid grid-cols-3 gap-3 mt-2">
                  <button className="border-2 border-slate-900 rounded-lg p-4 text-sm font-medium">
                    Light
                  </button>
                  <button className="border border-slate-200 rounded-lg p-4 text-sm font-medium hover:border-slate-300">
                    Dark
                  </button>
                  <button className="border border-slate-200 rounded-lg p-4 text-sm font-medium hover:border-slate-300">
                    System
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="bg-white rounded-lg border border-red-200 p-6">
            <h2 className="text-lg font-semibold text-red-900 mb-2">Danger Zone</h2>
            <p className="text-sm text-slate-600 mb-4">
              These actions are permanent and cannot be undone.
            </p>
            <div className="space-y-3">
              <Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-50">
                Export All Data
              </Button>
              <Button variant="destructive">
                Delete Organization
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
