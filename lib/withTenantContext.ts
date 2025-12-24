import { Prisma } from '@prisma/client'
import { prisma } from './prisma'

/**
 * Tenant context information required for all database operations
 */
export interface TenantContext {
  tenantId: string
  userId: string
  ipAddress: string
}

/**
 * Transaction client type from Prisma
 */
type PrismaTransactionClient = Omit<
  Prisma.TransactionClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>

/**
 * Executes a function within a transaction that sets Postgres session variables
 * for RLS enforcement. All queries within the callback will automatically be
 * scoped to the tenant via RLS policies.
 * 
 * @param context - Tenant context (tenantId, userId, ipAddress)
 * @param callback - Function that receives a Prisma transaction client
 * @returns Result of the callback function
 */
export async function withTenantContext<T>(
  context: TenantContext,
  callback: (tx: PrismaTransactionClient) => Promise<T>
): Promise<T> {
  // Validate UUIDs to prevent SQL injection
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!uuidRegex.test(context.tenantId) || !uuidRegex.test(context.userId)) {
    throw new Error('Invalid UUID format in tenant context')
  }
  
  // Escape IP address for SQL (basic validation)
  const ipRegex = /^[0-9a-f.:]+$/i
  if (!ipRegex.test(context.ipAddress)) {
    throw new Error('Invalid IP address format')
  }
  
  return await prisma.$transaction(async (tx) => {
    // Set Postgres session variables for RLS enforcement
    // These must be set BEFORE any queries in the transaction
    // Using $executeRawUnsafe with validated inputs
    
    // DEBUG: Log what we're setting
    console.log('🔐 Setting session variables:', {
      tenant_id: context.tenantId,
      user_id: context.userId,
      ip: context.ipAddress
    })
    
    // Set session variables for RLS enforcement
    // Using SET LOCAL - these are transaction-scoped and will be cleared when transaction ends
    await tx.$executeRawUnsafe(
      `SET LOCAL app.current_tenant_id = '${context.tenantId}'`
    )
    await tx.$executeRawUnsafe(
      `SET LOCAL app.current_user_id = '${context.userId}'`
    )
           await tx.$executeRawUnsafe(
             `SET LOCAL app.current_user_ip = '${(context.ipAddress || 'unknown').replace(/'/g, "''")}'`
           )
    
    // CRITICAL: Verify session variables were set correctly
    // This ensures RLS policies will work properly
    const verifyResult = await tx.$queryRawUnsafe<Array<{
      tenant_id: string | null
      user_id: string | null
    }>>(
      `SELECT 
        current_setting('app.current_tenant_id', true)::uuid as tenant_id,
        current_setting('app.current_user_id', true)::uuid as user_id
      `
    )
    
    const verified = verifyResult[0]
    if (!verified || verified.tenant_id !== context.tenantId || verified.user_id !== context.userId) {
      console.error('❌ Session variables verification failed:', {
        expected: { tenantId: context.tenantId, userId: context.userId },
        actual: verified
      })
      throw new Error('Failed to set session variables for RLS enforcement')
    }
    
    console.log('✅ Verified session variables in DB:', {
      tenant_id: verified.tenant_id,
      user_id: verified.user_id
    })

    // Execute the callback with the transaction client
    // All queries here will be automatically scoped by RLS
    return await callback(tx)
  })
}

/**
 * Helper to get tenant context from auth session and request
 * This is the ONLY way to get tenant context - never trust client input
 * 
 * @param ipAddress - Optional IP address from request headers
 * @returns TenantContext with validated user and tenant IDs
 * @throws Error if user is not authenticated or tenant is not selected
 */
export async function getTenantContext(ipAddress?: string): Promise<TenantContext> {
  // Import here to avoid circular dependency
  const { requireTenant } = await import('./auth/session')
  
  // Get authenticated session with tenant
  // This will throw if user is not authenticated or tenant not selected
  const session = await requireTenant()
  
  return {
    tenantId: session.tenantId,
    userId: session.userId,
    ipAddress: ipAddress || '127.0.0.1' // Fallback to localhost if no IP provided
  }
}

/**
 * Helper to get IP address from Next.js headers
 * Use this in Server Actions and API routes
 */
export async function getClientIp(): Promise<string> {
  const { headers } = await import('next/headers')
  const headersList = await headers()
  
  // Try various headers that might contain client IP
  const forwarded = headersList.get('x-forwarded-for')
  if (forwarded) {
    // x-forwarded-for can contain multiple IPs, get the first one
    return forwarded.split(',')[0].trim()
  }
  
  const realIp = headersList.get('x-real-ip')
  if (realIp) {
    return realIp
  }
  
  // Fallback
  return '127.0.0.1'
}

