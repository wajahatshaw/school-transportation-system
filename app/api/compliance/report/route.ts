import { NextRequest, NextResponse } from 'next/server'
import { withTenantContext, getTenantContext } from '@/lib/withTenantContext'
import { evaluateTenant, evaluateDriversBatch } from '@/lib/compliance/rules'

export async function GET(request: NextRequest) {
  try {
    const context = await getTenantContext()
    const searchParams = request.nextUrl.searchParams
    const format = searchParams.get('format') || 'json' // 'json' | 'csv'
    
    return await withTenantContext(context, async (tx) => {
      // Get tenant-level summary
      const tenantEval = await evaluateTenant()
      
      // Get all drivers with their names
      const drivers = await tx.$queryRaw<Array<{
        id: string
        first_name: string
        last_name: string
        email: string | null
      }>>`
        SELECT id, first_name, last_name, email 
        FROM app.v_drivers 
        WHERE deleted_at IS NULL 
        ORDER BY last_name, first_name
      `
      
      // OPTIMIZED: Use batch evaluation instead of per-driver queries
      const driverIds = drivers.map(d => d.id)
      const evaluationsMap = await evaluateDriversBatch(driverIds)
      
      // Convert map to array and combine with driver info
      const driverEvaluations = drivers.map(driver => {
        const evaluation = evaluationsMap.get(driver.id) || {
          driverId: driver.id,
          compliant: false,
          complianceScore: 0,
          expiredCount: 0,
          expiringCount: 0,
          missingCount: 0,
          documents: [],
          missingRequiredDocs: []
        }
        
        return {
          ...evaluation,
          driverName: `${driver.first_name} ${driver.last_name}`,
          driverEmail: driver.email
        }
      })
      
      if (format === 'csv') {
        // Generate CSV
        const csvRows: string[] = []
        
        // Header
        csvRows.push('Driver Name,Email,Compliant,Compliance Score (%),Expired Documents,Expiring Documents,Missing Documents,Missing Required Docs')
        
        // Data rows
        driverEvaluations.forEach(driverEval => {
          const missingDocs = driverEval.missingRequiredDocs.join('; ') || 'None'
          const compliant = driverEval.compliant ? 'Yes' : 'No'
          csvRows.push(
            `"${driverEval.driverName}","${driverEval.driverEmail || ''}",${compliant},${driverEval.complianceScore},${driverEval.expiredCount},${driverEval.expiringCount},${driverEval.missingCount},"${missingDocs}"`
          )
        })
        
        // Summary section
        csvRows.push('')
        csvRows.push('Summary')
        csvRows.push(`Total Drivers,${tenantEval.totalDrivers}`)
        csvRows.push(`Compliant Drivers,${tenantEval.compliantDrivers}`)
        csvRows.push(`Non-Compliant Drivers,${tenantEval.nonCompliantDrivers}`)
        csvRows.push(`Compliance Percentage,${tenantEval.compliancePercentage}%`)
        csvRows.push(`Total Expired Documents,${tenantEval.expiredCount}`)
        csvRows.push(`Total Expiring Documents,${tenantEval.expiringCount}`)
        csvRows.push(`Total Missing Documents,${tenantEval.missingCount}`)
        csvRows.push('')
        csvRows.push('Top Compliance Issues')
        tenantEval.topIssues.forEach(issue => {
          csvRows.push(`${issue.docType},${issue.count} drivers`)
        })
        
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
      { 
        success: false, 
        error: 'Failed to generate compliance report',
        ...(process.env.NODE_ENV === 'development' && {
          details: error instanceof Error ? error.message : 'Unknown error'
        })
      },
      { status: 500 }
    )
  }
}

