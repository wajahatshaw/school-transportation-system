import { NextResponse } from 'next/server'
import { withTenantContext, getTenantContext } from '@/lib/withTenantContext'
import { DEFAULT_REQUIRED_DOCS, DEFAULT_ALERT_WINDOWS } from '@/lib/compliance/rules'

export async function POST() {
  try {
    const context = await getTenantContext()
    
    await withTenantContext(context, async (tx) => {
      // Check if rules already exist for this tenant
      const existingRules = await tx.$queryRaw<Array<{ id: string }>>`
        SELECT id FROM app.v_compliance_rules
        WHERE role = 'driver'
        LIMIT 1
      `
      
      if (existingRules.length > 0) {
        // Rules already exist, update them to ensure they're correct
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
      } else {
        // No rules exist, create them
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
          `
        }
      }
    })
    
    return NextResponse.json({
      success: true,
      message: 'Default compliance rules have been initialized'
    })
  } catch (error) {
    console.error('Error seeding compliance rules:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to seed compliance rules',
        ...(process.env.NODE_ENV === 'development' && {
          details: error instanceof Error ? error.message : 'Unknown error'
        })
      },
      { status: 500 }
    )
  }
}

