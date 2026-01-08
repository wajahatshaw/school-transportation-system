import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { getDocumentsForAlerts } from '@/lib/compliance/rules'
import { withTenantContext } from '@/lib/withTenantContext'

const prisma = new PrismaClient()

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
 * Process alerts for a single tenant
 */
async function processTenantAlerts(tenantId: string): Promise<{ sent: number; skipped: number; errors: number }> {
  const context = { tenantId, userId: 'system' }
  
  return await withTenantContext(context, async (tx) => {
    const alerts = await getDocumentsForAlerts()
    const result = { sent: 0, skipped: 0, errors: 0 }
    
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
            'in_app',
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
            'alert_generated',
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
      } catch (error) {
        console.error(`Error processing alert for driver ${alert.driverId}, doc ${alert.docId}:`, error)
        result.errors++
      }
    }
    
    return result
  })
}

/**
 * Cron job endpoint for compliance alerts
 * 
 * This endpoint can be called by:
 * - Vercel Cron Jobs
 * - GitHub Actions
 * - External cron services
 * - Manual API calls
 * 
 * Security: Should be protected with a secret token in production
 */
export async function GET(request: NextRequest) {
  try {
    // Optional: Verify cron secret for security
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    console.log('[Compliance Alerts Cron] Starting compliance alerts job...')
    
    // Get all tenants
    const tenants = await prisma.tenant.findMany({
      select: { id: true, name: true }
    })
    
    console.log(`[Compliance Alerts Cron] Processing ${tenants.length} tenants...`)
    
    const results = await Promise.all(
      tenants.map(async (tenant) => {
        try {
          const result = await processTenantAlerts(tenant.id)
          console.log(`[Compliance Alerts Cron] Tenant ${tenant.name}: sent=${result.sent}, skipped=${result.skipped}, errors=${result.errors}`)
          return { tenantId: tenant.id, tenantName: tenant.name, ...result }
        } catch (error) {
          console.error(`[Compliance Alerts Cron] Error processing tenant ${tenant.name}:`, error)
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
    
    console.log(`[Compliance Alerts Cron] Completed: sent=${totalSent}, skipped=${totalSkipped}, errors=${totalErrors}`)
    
    return NextResponse.json({
      success: true,
      message: 'Compliance alerts processed',
      data: {
        tenants: results,
        totals: {
          sent: totalSent,
          skipped: totalSkipped,
          errors: totalErrors
        }
      }
    })
  } catch (error) {
    console.error('[Compliance Alerts Cron] Fatal error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to process compliance alerts',
        ...(process.env.NODE_ENV === 'development' && {
          details: error instanceof Error ? error.message : 'Unknown error'
        })
      },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}

