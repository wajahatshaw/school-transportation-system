'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'

function parseHashParams(hash: string) {
  const raw = hash.startsWith('#') ? hash.slice(1) : hash
  const params = new URLSearchParams(raw)
  return {
    access_token: params.get('access_token'),
    refresh_token: params.get('refresh_token'),
    type: params.get('type'),
  }
}

export default function AcceptInvitePage() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState<'ready' | 'error'>('ready')
  const [message, setMessage] = useState<string>('')

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const run = async () => {
      try {
        // Support PKCE code flow (?code=...) and implicit flow (#access_token=...)
        const url = new URL(window.location.href)
        const code = url.searchParams.get('code')

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code)
          if (error) throw error
        } else {
          const { access_token, refresh_token } = parseHashParams(window.location.hash || '')
          if (access_token && refresh_token) {
            const { error } = await supabase.auth.setSession({ access_token, refresh_token })
            if (error) throw error
          }
        }

        const { data, error } = await supabase.auth.getUser()
        if (error || !data.user) {
          setMode('error')
          setMessage('Invite link is invalid or expired. Please request a new invite.')
          setLoading(false)
          return
        }

        setMode('ready')
        setMessage(data.user.email ? `Set a password for ${data.user.email}` : 'Set your password')
      } catch (e) {
        setMode('error')
        setMessage(e instanceof Error ? e.message : 'Failed to validate invite link')
      } finally {
        setLoading(false)
      }
    }
    run()
  }, [supabase])

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (submitting) return

    const p = password.trim()
    const c = confirmPassword.trim()

    if (p.length < 8) {
      toast.error('Password must be at least 8 characters')
      return
    }
    if (p !== c) {
      toast.error('Passwords do not match')
      return
    }

    setSubmitting(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: p })
      if (error) throw error

      toast.success('Password set successfully', {
        description: 'You can now sign in with your email and new password.',
      })

      // Since drivers might not have tenant membership yet, send them to login (not dashboard).
      await supabase.auth.signOut()
      router.replace('/login')
      router.refresh()
    } catch (err) {
      toast.error('Failed to set password', {
        description: err instanceof Error ? err.message : 'Please try again.',
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-6">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Accept invite
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {loading ? 'Verifying your invite link…' : message}
          </p>
        </div>

        {mode === 'error' ? (
          <div className="rounded-md bg-red-50 p-4 text-sm text-red-800">
            {message}
          </div>
        ) : (
          <form className="space-y-4" onSubmit={handleSetPassword}>
            <div>
              <label htmlFor="password" className="sr-only">
                New password
              </label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="New password (min 8 characters)"
                disabled={loading || submitting}
              />
            </div>
            <div>
              <label htmlFor="confirmPassword" className="sr-only">
                Confirm password
              </label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm password"
                disabled={loading || submitting}
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading || submitting}>
              {submitting ? 'Setting password…' : 'Set password'}
            </Button>
          </form>
        )}
      </div>
    </div>
  )
}


