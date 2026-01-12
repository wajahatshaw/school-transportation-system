import { NextRequest, NextResponse } from 'next/server'
import { getOutstandingBalances } from '@/lib/actions'
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

    const balances = await getOutstandingBalances()

    return NextResponse.json({ data: balances })
  } catch (error) {
    console.error('Error fetching outstanding balances:', error)
    return NextResponse.json(
      toPublicError(error, 'Failed to fetch outstanding balances'),
      { status: 500 }
    )
  }
}
