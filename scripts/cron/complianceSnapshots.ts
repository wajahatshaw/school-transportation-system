/**
 * Compliance Snapshots Cron Job
 * 
 * This script computes compliance snapshots for all drivers
 * and stores them for reporting and historical tracking.
 * 
 * Run this nightly via:
 * - Vercel Cron Jobs
 * - GitHub Actions
 * - External cron service
 * - Manual execution
 */

import { PrismaClient } from '@prisma/client'
import { evaluateDriver, evaluateTenant } from '@/lib/compliance/rules'
import { withTenantContext } from '@/lib/withTenantContext'

const prisma = new PrismaClient()

interface SnapshotResult {
  created: number
  errors: number
}

/**
 * Create snapshot for a single driver
 */
async function createDriverSnapshot(
  tenantId: string,
  driverId: string
): Promise<void> {
  const context = { tenantId, userId: 'system' }
  
  await withTenantContext(context, async (tx) => {
    const evaluation = await evaluateDriver(driverId)
    
    // Store snapshot
    await tx.$executeRaw`
      INSERT INTO compliance_snapshots (
        tenant_id, driver_id, compliance_score, compliant,
        expired_count, expiring_count, missing_count,
        computed_at, details_json
      )
      VALUES (
        ${tenantId}::uuid,
        ${driverId}::uuid,
        ${evaluation.complianceScore}::decimal,
        ${evaluation.compliant},
        ${evaluation.expiredCount},
        ${evaluation.expiringCount},
        ${evaluation.missingCount},
        NOW(),
        ${JSON.stringify({
          documents: evaluation.documents,
          missingRequiredDocs: evaluation.missingRequiredDocs
        })}::jsonb
      )
    `
  })
}

/**
 * Process snapshots for a single tenant
 */
async function processTenantSnapshots(tenantId: string): Promise<SnapshotResult> {
  const context = { tenantId, userId: 'system' }
  
  return await withTenantContext(context, async (tx) => {
    // Get all active drivers
    const drivers = await tx.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM app.v_drivers WHERE deleted_at IS NULL
    `
    
    const result: SnapshotResult = { created: 0, errors: 0 }
    
    for (const driver of drivers) {
      try {
        await createDriverSnapshot(tenantId, driver.id)
        result.created++
      } catch (error) {
        console.error(`Error creating snapshot for driver ${driver.id}:`, error)
        result.errors++
      }
    }
    
    // Also create tenant-level snapshot (driver_id = NULL)
    try {
      const tenantEval = await evaluateTenant()
      
      await tx.$executeRaw`
        INSERT INTO compliance_snapshots (
          tenant_id, driver_id, compliance_score, compliant,
          expired_count, expiring_count, missing_count,
          computed_at, details_json
        )
        VALUES (
          ${tenantId}::uuid,
          NULL,
          ${tenantEval.compliancePercentage}::decimal,
          ${tenantEval.compliancePercentage === 100},
          ${tenantEval.expiredCount},
          ${tenantEval.expiringCount},
          ${tenantEval.missingCount},
          NOW(),
          ${JSON.stringify({
            totalDrivers: tenantEval.totalDrivers,
            compliantDrivers: tenantEval.compliantDrivers,
            topIssues: tenantEval.topIssues
          })}::jsonb
        )
      `
      
      result.created++
    } catch (error) {
      console.error(`Error creating tenant snapshot:`, error)
      result.errors++
    }
    
    // Log to audit_logs
    await tx.$executeRaw`
      INSERT INTO audit_logs (
        tenant_id, table_name, record_id, action, after, user_id
      )
      VALUES (
        ${tenantId}::uuid,
        'compliance_snapshots',
        gen_random_uuid(),
        'snapshot_created',
        ${JSON.stringify({
          driversProcessed: drivers.length,
          snapshotsCreated: result.created
        })}::jsonb,
        'system'::uuid
      )
    `
    
    return result
  })
}

/**
 * Main function to run compliance snapshots for all tenants
 */
export async function runComplianceSnapshots(): Promise<void> {
  try {
    console.log('[Compliance Snapshots] Starting compliance snapshots job...')
    
    // Get all tenants
    const tenants = await prisma.tenant.findMany({
      select: { id: true, name: true }
    })
    
    console.log(`[Compliance Snapshots] Processing ${tenants.length} tenants...`)
    
    const results = await Promise.all(
      tenants.map(async (tenant) => {
        try {
          const result = await processTenantSnapshots(tenant.id)
          console.log(`[Compliance Snapshots] Tenant ${tenant.name}: created=${result.created}, errors=${result.errors}`)
          return { tenantId: tenant.id, tenantName: tenant.name, ...result }
        } catch (error) {
          console.error(`[Compliance Snapshots] Error processing tenant ${tenant.name}:`, error)
          return {
            tenantId: tenant.id,
            tenantName: tenant.name,
            created: 0,
            errors: 1
          }
        }
      })
    )
    
    const totalCreated = results.reduce((sum, r) => sum + r.created, 0)
    const totalErrors = results.reduce((sum, r) => sum + r.errors, 0)
    
    console.log(`[Compliance Snapshots] Completed: created=${totalCreated}, errors=${totalErrors}`)
  } catch (error) {
    console.error('[Compliance Snapshots] Fatal error:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run if executed directly
if (require.main === module) {
  runComplianceSnapshots()
    .then(() => {
      console.log('[Compliance Snapshots] Job completed successfully')
      process.exit(0)
    })
    .catch((error) => {
      console.error('[Compliance Snapshots] Job failed:', error)
      process.exit(1)
    })
}

