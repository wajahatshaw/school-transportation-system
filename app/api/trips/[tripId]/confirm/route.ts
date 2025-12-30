import { NextRequest, NextResponse } from 'next/server'
import { confirmTrip } from '@/lib/actions'
import { getSession } from '@/lib/auth/session'

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
    const errorMessage = error instanceof Error ? error.message : 'Failed to confirm trip'
    
    if (errorMessage.includes('already confirmed')) {
      return NextResponse.json(
        { error: errorMessage },
        { status: 409 }
      )
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}

