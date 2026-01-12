import { NextRequest, NextResponse } from 'next/server'
import { getPaymentsSummary } from '@/lib/actions'
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

    const summary = await getPaymentsSummary()

    return NextResponse.json({ data: summary })
  } catch (error) {
    console.error('Error fetching payments summary:', error)
    return NextResponse.json(
      toPublicError(error, 'Failed to fetch payments summary'),
      { status: 500 }
    )
  }
}
