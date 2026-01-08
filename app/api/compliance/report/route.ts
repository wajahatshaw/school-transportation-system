import { NextRequest, NextResponse } from 'next/server'
import { withTenantContext, getTenantContext } from '@/lib/withTenantContext'
import { evaluateTenant, evaluateDriver } from '@/lib/compliance/rules'

export async function GET(request: NextRequest) {
  try {
    const context = await getTenantContext()
    const searchParams = request.nextUrl.searchParams
    const format = searchParams.get('format') || 'json' // 'json' | 'csv'
    
    return await withTenantContext(context, async (tx) => {
      // Get tenant-level summary
      const tenantEval = await evaluateTenant()
      
      // Get all drivers with their evaluations
      const drivers = await tx.$queryRaw<Array<{ id: string }>>`
        SELECT id FROM app.v_drivers WHERE deleted_at IS NULL ORDER BY id
      `
      
      const driverEvaluations = await Promise.all(
        drivers.map(d => evaluateDriver(d.id))
      )
      
      if (format === 'csv') {
        // Generate CSV
        const csvRows: string[] = []
        
        // Header
        csvRows.push('Driver ID,Compliant,Compliance Score,Expired Count,Expiring Count,Missing Count,Missing Required Docs')
        
        // Data rows
        driverEvaluations.forEach(driverEval => {
          const missingDocs = driverEval.missingRequiredDocs.join('; ')
          csvRows.push(
            `${driverEval.driverId},${driverEval.compliant},${driverEval.complianceScore},${driverEval.expiredCount},${driverEval.expiringCount},${driverEval.missingCount},"${missingDocs}"`
          )
        })
        
        // Summary row
        csvRows.push('')
        csvRows.push('Summary')
        csvRows.push(`Total Drivers,${tenantEval.totalDrivers}`)
        csvRows.push(`Compliant Drivers,${tenantEval.compliantDrivers}`)
        csvRows.push(`Non-Compliant Drivers,${tenantEval.nonCompliantDrivers}`)
        csvRows.push(`Compliance Percentage,${tenantEval.compliancePercentage}%`)
        csvRows.push(`Total Expired Documents,${tenantEval.expiredCount}`)
        csvRows.push(`Total Expiring Documents,${tenantEval.expiringCount}`)
        csvRows.push(`Total Missing Documents,${tenantEval.missingCount}`)
        
        return new NextResponse(csvRows.join('\n'), {
          headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': `attachment; filename="compliance-report-${new Date().toISOString().split('T')[0]}.csv"`
          }
        })
      }
      
      // JSON format
      return NextResponse.json({
        success: true,
        data: {
          summary: tenantEval,
          drivers: driverEvaluations,
          generatedAt: new Date().toISOString()
        }
      })
    })
  } catch (error) {
    console.error('Error generating compliance report:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to generate compliance report' },
      { status: 500 }
    )
  }
}

