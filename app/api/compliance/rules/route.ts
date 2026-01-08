import { NextRequest, NextResponse } from 'next/server'
import { withTenantContext, getTenantContext } from '@/lib/withTenantContext'
import { getComplianceRules } from '@/lib/compliance/rules'

export async function GET() {
  try {
    const rules = await getComplianceRules('driver')
    
    return NextResponse.json({
      success: true,
      data: rules
    })
  } catch (error) {
    console.error('Error fetching compliance rules:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch compliance rules' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const context = await getTenantContext()
    const body = await request.json()
    const { role, docType, required, graceDays, alertWindows } = body
    
    if (!docType) {
      return NextResponse.json(
        { success: false, error: 'docType is required' },
        { status: 400 }
      )
    }
    
    return await withTenantContext(context, async (tx) => {
      // Check if rule already exists
      const existing = await tx.$queryRaw<Array<{ id: string }>>`
        SELECT id FROM app.v_compliance_rules
        WHERE role = ${role || 'driver'} AND doc_type = ${docType}
        LIMIT 1
      `
      
      if (existing.length > 0) {
        // Update existing rule
        await tx.$executeRaw`
          UPDATE compliance_rules
          SET 
            required = ${required ?? true},
            grace_days = ${graceDays ?? 0},
            alert_windows_json = ${JSON.stringify(alertWindows || [30, 15, 7])}::jsonb,
            updated_at = NOW()
          WHERE id = ${existing[0].id}::uuid
            AND tenant_id = ${context.tenantId}::uuid
        `
        
        return NextResponse.json({
          success: true,
          message: 'Compliance rule updated'
        })
      } else {
        // Create new rule
        const result = await tx.$queryRaw<Array<{ id: string }>>`
          INSERT INTO compliance_rules (
            tenant_id, role, doc_type, required, grace_days, alert_windows_json
          )
          VALUES (
            ${context.tenantId}::uuid,
            ${role || 'driver'},
            ${docType},
            ${required ?? true},
            ${graceDays ?? 0},
            ${JSON.stringify(alertWindows || [30, 15, 7])}::jsonb
          )
          RETURNING id
        `
        
        return NextResponse.json({
          success: true,
          data: { id: result[0].id },
          message: 'Compliance rule created'
        })
      }
    })
  } catch (error) {
    console.error('Error creating/updating compliance rule:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to save compliance rule' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const context = await getTenantContext()
    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get('id')
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Rule ID is required' },
        { status: 400 }
      )
    }
    
    return await withTenantContext(context, async (tx) => {
      await tx.$executeRaw`
        DELETE FROM compliance_rules
        WHERE id = ${id}::uuid
          AND tenant_id = ${context.tenantId}::uuid
      `
      
      return NextResponse.json({
        success: true,
        message: 'Compliance rule deleted'
      })
    })
  } catch (error) {
    console.error('Error deleting compliance rule:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete compliance rule' },
      { status: 500 }
    )
  }
}

