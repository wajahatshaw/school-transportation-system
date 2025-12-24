'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { setSelectedTenant, clearSession } from './session'

/**
 * Server action to handle email/password login
 */
export async function loginAction(email: string, password: string) {
  const supabase = await createClient()
  
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })
  
  if (error) {
    return { error: error.message }
  }
  
  // Redirect to tenant selection
  redirect('/select-tenant')
}

/**
 * Server action to handle user signup
 */
export async function signupAction(email: string, password: string) {
  const supabase = await createClient()
  
  const { error } = await supabase.auth.signUp({
    email,
    password,
  })
  
  if (error) {
    return { error: error.message }
  }
  
  return { success: true }
}

/**
 * Server action to select a tenant
 */
export async function selectTenantAction(tenantId: string) {
  try {
    await setSelectedTenant(tenantId)
    redirect('/dashboard')
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to select tenant' }
  }
}

/**
 * Server action to auto-select tenant (for single-tenant users)
 */
export async function autoSelectTenantAction(tenantId: string) {
  try {
    await setSelectedTenant(tenantId)
    // Return success - redirect will be handled by the client
    return { success: true }
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to select tenant' }
  }
}

/**
 * Server action to logout
 */
export async function logoutAction() {
  await clearSession()
  redirect('/login')
}

