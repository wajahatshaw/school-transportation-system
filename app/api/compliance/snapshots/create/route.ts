import { NextResponse } from 'next/server'
import { evaluateDriver, evaluateTenant } from '@/lib/compliance/rules'
import { withTenantContext, getTenantContext } from '@/lib/withTenantContext'

/**
 * Create compliance snapshots for all drivers or a specific driver
 * This captures the compliance state at a point in time for historical tracking
 */
export async function POST(request: Request) {
  try {
    const context = await getTenantContext()
    const body = await request.json().catch(() => ({}))
    const driverId = body.driverId // Optional: if provided, only snapshot this driver
    
    const result = await withTenantContext(context, async (tx) => {
      if (driverId) {
        // Snapshot a single driver
        const evaluation = await evaluateDriver(driverId, tx)
        
        await tx.$executeRaw`
          INSERT INTO compliance_snapshots (
            tenant_id, driver_id, compliance_score, compliant,
            expired_count, expiring_count, missing_count,
            computed_at, details_json
          )
          VALUES (
            ${context.tenantId}::uuid,
            ${driverId}::uuid,
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
        
        return { created: 1, driverId }
      } else {
        // Snapshot all drivers (tenant-level)
        const tenantEvaluation = await evaluateTenant()
        
        // Get all driver IDs
        const drivers = await tx.$queryRaw<Array<{ id: string }>>`
          SELECT id FROM app.v_drivers WHERE deleted_at IS NULL
        `
        
        let created = 0
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
        
        // Also create a tenant-level snapshot (without driver_id)
        await tx.$executeRaw`
          INSERT INTO compliance_snapshots (
            tenant_id, driver_id, compliance_score, compliant,
            expired_count, expiring_count, missing_count,
            computed_at, details_json
          )
          VALUES (
            ${context.tenantId}::uuid,
            NULL,
            ${tenantEvaluation.compliancePercentage}::numeric,
            ${tenantEvaluation.compliancePercentage === 100},
            ${tenantEvaluation.expiredCount},
            ${tenantEvaluation.expiringCount},
            ${tenantEvaluation.missingCount},
            NOW(),
            ${JSON.stringify({
              totalDrivers: tenantEvaluation.totalDrivers,
              compliantDrivers: tenantEvaluation.compliantDrivers,
              nonCompliantDrivers: tenantEvaluation.nonCompliantDrivers,
              topIssues: tenantEvaluation.topIssues
            })}::jsonb
          )
        `
        
        return { created: created + 1, total: drivers.length + 1 }
      }
    })
    
    return NextResponse.json({
      success: true,
      data: result,
      message: `Created ${result.created} compliance snapshot(s)`
    })
  } catch (error) {
    console.error('Error creating compliance snapshots:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to create compliance snapshots',
        ...(process.env.NODE_ENV === 'development' && {
          details: error instanceof Error ? error.message : 'Unknown error'
        })
      },
      { status: 500 }
    )
  }
}

