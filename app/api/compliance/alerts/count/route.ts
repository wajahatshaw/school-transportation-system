import { NextResponse } from 'next/server'
import { getDocumentsForAlerts } from '@/lib/compliance/rules'

export async function GET() {
  try {
    const alerts = await getDocumentsForAlerts()
    
    // Count alerts by type
    const expiredCount = alerts.filter(a => a.alertType === 'expired').length
    const expiringCount = alerts.filter(a => a.alertType === 'expiring').length
    const totalCount = alerts.length
    
    return NextResponse.json({
      success: true,
      data: {
        total: totalCount,
        expired: expiredCount,
        expiring: expiringCount
      }
    })
  } catch (error) {
    console.error('Error fetching alert count:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch alert count',
        data: { total: 0, expired: 0, expiring: 0 }
      },
      { status: 500 }
    )
  }
}

