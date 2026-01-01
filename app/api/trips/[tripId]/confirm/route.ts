import { NextRequest, NextResponse } from 'next/server'
import { confirmTrip } from '@/lib/actions'
import { getSession } from '@/lib/auth/session'
import { toPublicError } from '@/lib/api/public-errors'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(
  request: NextRequest,
  { params }: { params: { tripId: string } }
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

    const tripId = params.tripId

    const trip = await confirmTrip(tripId)

    return NextResponse.json(trip, { status: 200 })
  } catch (error) {
    console.error('Error confirming trip:', error)
    if (error instanceof Error && error.message.includes('already confirmed')) {
      return NextResponse.json({ error: 'This trip is already confirmed.' }, { status: 409 })
    }
    const pub = toPublicError(error, 'Failed to confirm trip. Please try again.')
    return NextResponse.json({ error: pub.message }, { status: pub.status })
  }
}

