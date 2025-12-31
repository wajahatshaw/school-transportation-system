'use server'

import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

/**
 * Session data structure
 */
export interface Session {
  userId: string        // Internal users.id
  authUserId: string    // Supabase auth.users.id
  email: string
  tenantId: string | null
  tenantName: string | null
  role: string | null
  driverId?: string | null
}

/**
 * Tenant membership information
 */
export interface TenantMembership {
  id: string
  name: string
  role: string
}

const SESSION_COOKIE_NAME = 'app_session'

/**
 * Gets the current authenticated user from Supabase
 * Returns null if not authenticated
 */
export async function getAuthUser() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error || !user) {
    return null
  }
  
  return user
}

/**
 * Gets or creates the internal user record
 * Maps Supabase auth user to our users table
 */
export async function getOrCreateInternalUser(authUserId: string, email: string) {
  // Try to find existing user
  let user = await prisma.user.findUnique({
    where: { authUserId }
  })
  
  // Create if doesn't exist
  if (!user) {
    user = await prisma.user.create({
      data: {
        authUserId,
        email
      }
    })
  }
  
  return user
}

/**
 * Gets all tenants that the user has access to
 */
export async function getUserTenants(userId: string): Promise<TenantMembership[]> {
  const memberships = await prisma.membership.findMany({
    where: { userId },
    include: {
      tenant: {
        select: {
          id: true,
          name: true
        }
      }
    }
  })
  
  return memberships.map(m => ({
    id: m.tenant.id,
    name: m.tenant.name,
    role: m.role
  }))
}

/**
 * Validates that a user has access to a specific tenant
 */
export async function validateTenantAccess(userId: string, tenantId: string): Promise<boolean> {
  const membership = await prisma.membership.findUnique({
    where: {
      userId_tenantId: {
        userId,
        tenantId
      }
    }
  })
  
  return !!membership
}

/**
 * Gets the current session from cookies
 * Returns null if no session exists or is invalid
 */
export async function getSession(): Promise<Session | null> {
  // Get Supabase auth user
  const authUser = await getAuthUser()
  if (!authUser) {
    return null
  }
  
  // Get or create internal user
  const internalUser = await getOrCreateInternalUser(authUser.id, authUser.email!)
  
  // Get tenant selection from cookie
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)
  
  let tenantId: string | null = null
  let tenantName: string | null = null
  let role: string | null = null
  let driverId: string | null = null
  
  console.log('🍪 Session cookie raw value:', sessionCookie?.value)
  
  if (sessionCookie?.value) {
    try {
      const sessionData = JSON.parse(sessionCookie.value)
      tenantId = sessionData.tenantId || null
      
      console.log('📋 Parsed tenant from cookie:', tenantId)
      
      // Validate tenant access
      if (tenantId) {
        const hasAccess = await validateTenantAccess(internalUser.id, tenantId)
        if (!hasAccess) {
          console.log('❌ User does not have access to tenant:', tenantId)
          // User doesn't have access to this tenant anymore
          tenantId = null
        } else {
          console.log('✅ User has access to tenant:', tenantId)
          // Get tenant details
          const membership = await prisma.membership.findUnique({
            where: {
              userId_tenantId: {
                userId: internalUser.id,
                tenantId
              }
            },
            include: {
              tenant: {
                select: {
                  name: true
                }
              }
            }
          })
          
          if (membership) {
            tenantName = membership.tenant.name
            role = membership.role
            driverId = (membership as any).driverId ?? null
            console.log('🏢 Tenant details:', { tenantName, role })
          }
        }
      }
    } catch (error) {
      console.log('⚠️ Error parsing session cookie:', error)
      // Invalid session cookie, ignore
    }
  }
  
  // For driver accounts, derive driverId from drivers table (source of truth for trip assignment).
  // This prevents leaking other drivers' trips if memberships.driver_id is missing/misconfigured.
  if (tenantId && role === 'driver') {
    try {
      const found = await prisma.$queryRaw<Array<{ id: string }>>`
        SELECT id
        FROM public.drivers
        WHERE tenant_id = ${tenantId}::uuid
          AND deleted_at IS NULL
          AND (
            auth_user_id = ${authUser.id}::uuid
            OR lower(email) = lower(${authUser.email!})
          )
        LIMIT 1
      `
      driverId = found[0]?.id ?? null
    } catch (e) {
      console.error('Failed to derive driverId from drivers table:', e)
      driverId = null
    }
  }

  const session = {
    userId: internalUser.id,
    authUserId: authUser.id,
    email: authUser.email!,
    tenantId,
    tenantName,
    role,
    driverId
  }
  
  console.log('📦 Final session:', { 
    userId: session.userId, 
    email: session.email, 
    tenantId: session.tenantId,
    tenantName: session.tenantName 
  })
  
  return session
}

/**
 * Sets the selected tenant in the session
 * Must be called from a Server Action
 */
export async function setSelectedTenant(tenantId: string): Promise<void> {
  'use server'
  
  const session = await getSession()
  if (!session) {
    throw new Error('Not authenticated')
  }
  
  // Validate tenant access
  const hasAccess = await validateTenantAccess(session.userId, tenantId)
  if (!hasAccess) {
    throw new Error('Access denied to this tenant')
  }
  
  // Store tenant selection in cookie
  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE_NAME, JSON.stringify({ tenantId }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/'
  })
}

/**
 * Clears the session (logout)
 * Must be called from a Server Action
 */
export async function clearSession(): Promise<void> {
  'use server'
  
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE_NAME)
  
  const supabase = await createClient()
  await supabase.auth.signOut()
}

/**
 * Requires authentication, throws if not authenticated
 */
export async function requireAuth(): Promise<Session> {
  const session = await getSession()
  if (!session) {
    throw new Error('Authentication required')
  }
  return session
}

/**
 * Requires tenant selection, throws if no tenant selected
 */
export type SessionWithTenant = Omit<Session, 'tenantId' | 'tenantName' | 'role'> & {
  tenantId: string
  tenantName: string
  role: string
  driverId?: string | null
}

export async function requireTenant(): Promise<SessionWithTenant> {
  const session = await requireAuth()
  if (!session.tenantId || !session.tenantName || !session.role) {
    throw new Error('Tenant selection required')
  }
  return {
    userId: session.userId,
    authUserId: session.authUserId,
    email: session.email,
    tenantId: session.tenantId,
    tenantName: session.tenantName,
    role: session.role,
    driverId: session.driverId ?? null
  }
}

