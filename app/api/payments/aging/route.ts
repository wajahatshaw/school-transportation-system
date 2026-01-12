import { NextRequest, NextResponse } from 'next/server'
import { getAgingReport } from '@/lib/actions'
import { getSession } from '@/lib/auth/session'
import { toPublicError } from '@/lib/api/public-errors'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }
    
    if (!session.tenantId) {
      return NextResponse.json(
        { error: 'Tenant selection required' },
        { status: 403 }
      )
    }

    const report = await getAgingReport()

    return NextResponse.json({ data: report })
  } catch (error) {
    console.error('Error fetching aging report:', error)
    return NextResponse.json(
      toPublicError(error, 'Failed to fetch aging report'),
      { status: 500 }
    )
  }
}
