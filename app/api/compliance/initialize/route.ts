import { NextResponse } from 'next/server'
import { withTenantContext, getTenantContext } from '@/lib/withTenantContext'
import { getDocumentsForAlerts } from '@/lib/compliance/rules'
import { evaluateDriver, evaluateTenant } from '@/lib/compliance/rules'

/**
 * Initialize all compliance tables with default data
 * This endpoint:
 * 1. Seeds default compliance rules
 * 2. Generates initial alerts
 * 3. Creates initial snapshots
 */
export async function POST() {
  try {
    const context = await getTenantContext()
    const results: Record<string, any> = {}
    
    // 1. Seed compliance rules (call the seed function directly)
    try {
      const { DEFAULT_REQUIRED_DOCS, DEFAULT_ALERT_WINDOWS } = await import('@/lib/compliance/rules')
      
      await withTenantContext(context, async (tx) => {
        for (const docType of DEFAULT_REQUIRED_DOCS) {
          await tx.$executeRaw`
            INSERT INTO compliance_rules (
              tenant_id, role, doc_type, required, grace_days, alert_windows_json
            )
            VALUES (
              ${context.tenantId}::uuid,
              'driver',
              ${docType},
              true,
              0,
              ${JSON.stringify(DEFAULT_ALERT_WINDOWS)}::jsonb
            )
            ON CONFLICT (tenant_id, role, doc_type)
            DO UPDATE SET
              required = EXCLUDED.required,
              grace_days = EXCLUDED.grace_days,
              alert_windows_json = EXCLUDED.alert_windows_json,
              updated_at = NOW()
          `
        }
      })
      results.rules = { success: true, message: 'Rules seeded' }
    } catch (error) {
      results.rules = { error: error instanceof Error ? error.message : 'Failed to seed rules' }
    }
    
    // 2. Generate alerts
    try {
      const alerts = await getDocumentsForAlerts()
      let sent = 0
      let skipped = 0
      
      await withTenantContext(context, async (tx) => {
        for (const alert of alerts) {
          const dedupeKey = `${alert.driverId}:${alert.docId}:${alert.alertType}:${alert.alertWindowDays}`
          
          const existing = await tx.$queryRaw<Array<{ id: string }>>`
            SELECT id FROM app.v_compliance_alerts
            WHERE dedupe_key = ${dedupeKey}
            LIMIT 1
          `
          
          if (existing.length > 0) {
            skipped++
            continue
          }
          
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
          sent++
        }
      })
      results.alerts = { success: true, sent, skipped, total: alerts.length }
    } catch (error) {
      results.alerts = { error: error instanceof Error ? error.message : 'Failed to generate alerts' }
    }
    
    // 3. Create snapshots
    try {
      const drivers = await withTenantContext(context, async (tx) => {
        return await tx.$queryRaw<Array<{ id: string }>>`
          SELECT id FROM app.v_drivers WHERE deleted_at IS NULL
        `
      })
      
      let created = 0
      await withTenantContext(context, async (tx) => {
        for (const driver of drivers) {
          try {
            const evaluation = await evaluateDriver(driver.id, tx)
            
            await tx.$executeRaw`
              INSERT INTO compliance_snapshots (
                tenant_id, driver_id, compliance_score, compliant,
                expired_count, expiring_count, missing_count,
                computed_at, details_json
              )
              VALUES (
                ${context.tenantId}::uuid,
                ${driver.id}::uuid,
                ${evaluation.complianceScore}::numeric,
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
            created++
          } catch (error) {
            console.error(`Error creating snapshot for driver ${driver.id}:`, error)
          }
        }
      })
      results.snapshots = { success: true, created, total: drivers.length }
    } catch (error) {
      results.snapshots = { error: error instanceof Error ? error.message : 'Failed to create snapshots' }
    }
    
    return NextResponse.json({
      success: true,
      message: 'Compliance system initialized',
      data: results
    })
  } catch (error) {
    console.error('Error initializing compliance system:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to initialize compliance system',
        ...(process.env.NODE_ENV === 'development' && {
          details: error instanceof Error ? error.message : 'Unknown error'
        })
      },
      { status: 500 }
    )
  }
}

