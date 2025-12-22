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
    await tx.$executeRawUnsafe(
      `SET LOCAL app.current_tenant_id = '${context.tenantId}'`
    )
    await tx.$executeRawUnsafe(
      `SET LOCAL app.current_user_id = '${context.userId}'`
    )
    await tx.$executeRawUnsafe(
      `SET LOCAL app.current_user_ip = '${context.ipAddress.replace(/'/g, "''")}'`
    )

    // Execute the callback with the transaction client
    // All queries here will be automatically scoped by RLS
    return await callback(tx)
  })
}

/**
 * Helper to get tenant context from request headers/cookies
 * In production, this would extract from auth session
 * 
 * For now, this is a placeholder that demonstrates the pattern
 */
export async function getTenantContext(): Promise<TenantContext> {
  // TODO: In production, extract from:
  // - Authentication session (userId, tenantId)
  // - Request headers (ipAddress from x-forwarded-for or similar)
  
  // For demo purposes, we'll get the first tenant and create a demo user
  // In production, replace this with actual auth extraction
  
  const tenant = await prisma.tenant.findFirst()
  if (!tenant) {
    throw new Error('No tenant found. Please create a tenant first.')
  }

  // In production, get from session:
  // const session = await getSession()
  // return {
  //   tenantId: session.tenantId,
  //   userId: session.userId,
  //   ipAddress: request.headers.get('x-forwarded-for') || request.ip || 'unknown'
  // }

  // Demo implementation - replace with real auth
  return {
    tenantId: tenant.id,
    userId: '00000000-0000-0000-0000-000000000000', // Demo user ID
    ipAddress: '127.0.0.1' // Demo IP
  }
}

