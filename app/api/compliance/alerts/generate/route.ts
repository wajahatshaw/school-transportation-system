import { NextResponse } from 'next/server'
import { getDocumentsForAlerts } from '@/lib/compliance/rules'
import { withTenantContext, getTenantContext } from '@/lib/withTenantContext'

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
 * Generate and store compliance alerts
 * This can be called manually or by a cron job
 */
export async function POST() {
  try {
    const context = await getTenantContext()
    
    const result = await withTenantContext(context, async (tx) => {
      const alerts = await getDocumentsForAlerts()
      const stats = { sent: 0, skipped: 0, errors: 0 }
      
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
            stats.skipped++
            continue
          }
          
          // Record alert in database
          await tx.$executeRaw`
            INSERT INTO compliance_alerts (
              tenant_id, driver_id, doc_id, alert_type, alert_window_days,
              sent_at, channel, dedupe_key
            )
            VALUES (
              ${context.tenantId}::uuid,
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
              ${context.tenantId}::uuid,
              'compliance_alerts',
              gen_random_uuid(),
              'alert_generated',
              ${JSON.stringify({
                driverId: alert.driverId,
                docId: alert.docId,
                alertType: alert.alertType,
                alertWindowDays: alert.alertWindowDays
              })}::jsonb,
              ${context.userId}::uuid
            )
          `
          
          stats.sent++
        } catch (error) {
          console.error(`Error processing alert for driver ${alert.driverId}, doc ${alert.docId}:`, error)
          stats.errors++
        }
      }
      
      return stats
    })
    
    return NextResponse.json({
      success: true,
      data: result,
      message: `Generated ${result.sent} alerts, skipped ${result.skipped} duplicates, ${result.errors} errors`
    })
  } catch (error) {
    console.error('Error generating compliance alerts:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to generate compliance alerts',
        ...(process.env.NODE_ENV === 'development' && {
          details: error instanceof Error ? error.message : 'Unknown error'
        })
      },
      { status: 500 }
    )
  }
}

