import { NextRequest, NextResponse } from 'next/server'
import { getTripById } from '@/lib/actions'
import { getSession } from '@/lib/auth/session'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(
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
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch trip'
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}

