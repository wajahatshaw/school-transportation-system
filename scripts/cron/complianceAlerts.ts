/**
 * Compliance Alerts Cron Job
 * 
 * This script finds documents that are expiring or expired
 * and sends alerts (email/in-app notifications).
 * 
 * Run this daily or as needed via:
 * - Vercel Cron Jobs
 * - GitHub Actions
 * - External cron service
 * - Manual execution
 */

import { PrismaClient } from '@prisma/client'
import { getDocumentsForAlerts } from '@/lib/compliance/rules'
import { withTenantContext, getTenantContext } from '@/lib/withTenantContext'

const prisma = new PrismaClient()

interface AlertResult {
  sent: number
  skipped: number
  errors: number
}

/**
 * Generate dedupe key for an alert
 */
function generateDedupeKey(
  driverId: string,
  docId: string,
  alertType: 'expiring' | 'expired',
  alertWindowDays: number
): string {
  return `${driverId}:${docId}:${alertType}:${alertWindowDays}`
}

/**
 * Send alert notification (placeholder - implement actual notification logic)
 */
async function sendAlert(
  driverId: string,
  docId: string,
  docType: string,
  alertType: 'expiring' | 'expired',
  expiresAt: Date,
  alertWindowDays: number
): Promise<{ success: boolean; channel?: string }> {
  // TODO: Implement actual notification sending
  // - Email via SendGrid, AWS SES, etc.
  // - In-app notifications
  // - SMS via Twilio, etc.
  
  console.log(`[ALERT] ${alertType.toUpperCase()}: Driver ${driverId}, Doc ${docType}, Expires ${expiresAt.toISOString()}, Window ${alertWindowDays} days`)
  
  // For now, just log and return success
  // In production, implement actual notification sending
  return { success: true, channel: 'log' }
}

/**
 * Process alerts for a single tenant
 */
async function processTenantAlerts(tenantId: string): Promise<AlertResult> {
  // Set tenant context (this would normally come from session/auth)
  // For cron jobs, we need to set it manually
  const context = { tenantId, userId: 'system' }
  
  return await withTenantContext(context, async (tx) => {
    const alerts = await getDocumentsForAlerts()
    const result: AlertResult = { sent: 0, skipped: 0, errors: 0 }
    
    for (const alert of alerts) {
      try {
        // Check if alert already sent (dedupe)
        const dedupeKey = generateDedupeKey(
          alert.driverId,
          alert.docId,
          alert.alertType,
          alert.alertWindowDays
        )
        
        const existing = await tx.$queryRaw<Array<{ id: string }>>`
          SELECT id FROM app.v_compliance_alerts
          WHERE dedupe_key = ${dedupeKey}
          LIMIT 1
        `
        
        if (existing.length > 0) {
          result.skipped++
          continue
        }
        
        // Send alert
        const sendResult = await sendAlert(
          alert.driverId,
          alert.docId,
          alert.docType,
          alert.alertType,
          alert.expiresAt,
          alert.alertWindowDays
        )
        
        if (sendResult.success) {
          // Record alert in database
          await tx.$executeRaw`
            INSERT INTO compliance_alerts (
              tenant_id, driver_id, doc_id, alert_type, alert_window_days,
              sent_at, channel, dedupe_key
            )
            VALUES (
              ${tenantId}::uuid,
              ${alert.driverId}::uuid,
              ${alert.docId}::uuid,
              ${alert.alertType},
              ${alert.alertWindowDays},
              NOW(),
              ${sendResult.channel || 'email'},
              ${dedupeKey}
            )
          `
          
          // Log to audit_logs
          await tx.$executeRaw`
            INSERT INTO audit_logs (
              tenant_id, table_name, record_id, action, after, user_id
            )
            VALUES (
              ${tenantId}::uuid,
              'compliance_alerts',
              gen_random_uuid(),
              'alert_sent',
              ${JSON.stringify({
                driverId: alert.driverId,
                docId: alert.docId,
                alertType: alert.alertType,
                alertWindowDays: alert.alertWindowDays
              })}::jsonb,
              'system'::uuid
            )
          `
          
          result.sent++
        } else {
          result.errors++
        }
      } catch (error) {
        console.error(`Error processing alert for driver ${alert.driverId}, doc ${alert.docId}:`, error)
        result.errors++
      }
    }
    
    return result
  })
}

/**
 * Main function to run compliance alerts for all tenants
 */
export async function runComplianceAlerts(): Promise<void> {
  try {
    console.log('[Compliance Alerts] Starting compliance alerts job...')
    
    // Get all tenants
    const tenants = await prisma.tenant.findMany({
      select: { id: true, name: true }
    })
    
    console.log(`[Compliance Alerts] Processing ${tenants.length} tenants...`)
    
    const results = await Promise.all(
      tenants.map(async (tenant) => {
        try {
          const result = await processTenantAlerts(tenant.id)
          console.log(`[Compliance Alerts] Tenant ${tenant.name}: sent=${result.sent}, skipped=${result.skipped}, errors=${result.errors}`)
          return { tenantId: tenant.id, tenantName: tenant.name, ...result }
        } catch (error) {
          console.error(`[Compliance Alerts] Error processing tenant ${tenant.name}:`, error)
          return {
            tenantId: tenant.id,
            tenantName: tenant.name,
            sent: 0,
            skipped: 0,
            errors: 1
          }
        }
      })
    )
    
    const totalSent = results.reduce((sum, r) => sum + r.sent, 0)
    const totalSkipped = results.reduce((sum, r) => sum + r.skipped, 0)
    const totalErrors = results.reduce((sum, r) => sum + r.errors, 0)
    
    console.log(`[Compliance Alerts] Completed: sent=${totalSent}, skipped=${totalSkipped}, errors=${totalErrors}`)
  } catch (error) {
    console.error('[Compliance Alerts] Fatal error:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run if executed directly
if (require.main === module) {
  runComplianceAlerts()
    .then(() => {
      console.log('[Compliance Alerts] Job completed successfully')
      process.exit(0)
    })
    .catch((error) => {
      console.error('[Compliance Alerts] Job failed:', error)
      process.exit(1)
    })
}

