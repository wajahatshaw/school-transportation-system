import { NextRequest, NextResponse } from 'next/server'
import { getTripById } from '@/lib/actions'
import { getSession } from '@/lib/auth/session'
import { toPublicError } from '@/lib/api/public-errors'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ tripId: string }> }
) {
  try {
    // Validate authentication and tenant selection
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

    const { tripId } = await context.params

    const trip = await getTripById(tripId)

    if (!trip) {
      return NextResponse.json(
        { error: 'Trip not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(trip, { status: 200 })
  } catch (error) {
    console.error('Error fetching trip:', error)
    const pub = toPublicError(error, 'Failed to load trip. Please try again.')
    return NextResponse.json({ error: pub.message }, { status: pub.status })
  }
}

