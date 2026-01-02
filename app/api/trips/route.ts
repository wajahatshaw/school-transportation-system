import { NextRequest, NextResponse } from 'next/server'
import { createRouteTrip, getRouteTrips } from '@/lib/actions'
import { getSession } from '@/lib/auth/session'
import { toPublicError } from '@/lib/api/public-errors'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
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

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams
    const routeId = searchParams.get('routeId') || undefined
    const driverId = searchParams.get('driverId') || undefined
    const routeType = searchParams.get('routeType') as 'AM' | 'PM' | undefined
    // Use strings to avoid timezone drift; lib/actions accepts Date | string
    const startDate = searchParams.get('startDate') || undefined
    const endDate = searchParams.get('endDate') || undefined
    const includeConfirmed = searchParams.get('includeConfirmed') !== 'false'

    const trips = await getRouteTrips({
      routeId,
      driverId,
      routeType,
      startDate,
      endDate,
      includeConfirmed
    })

    return NextResponse.json(trips, { status: 200 })
  } catch (error) {
    console.error('Error fetching trips:', error)
    const pub = toPublicError(error, 'Failed to load trips. Please try again.')
    return NextResponse.json({ error: pub.message }, { status: pub.status })
  }
}

export async function POST(request: NextRequest) {
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

    // Parse request body
    let body: {
      routeId?: string
      tripDate?: string
      routeType?: string
      driverId?: string
    }
    
    try {
      const text = await request.text()
      if (!text || text.trim() === '') {
        return NextResponse.json(
          { error: 'Request body is required' },
          { status: 400 }
        )
      }
      body = JSON.parse(text)
    } catch (parseError) {
      console.error('Error parsing request body:', parseError)
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      )
    }

    const { routeId, tripDate, routeType, driverId } = body

    if (!routeId || !tripDate || !routeType) {
      return NextResponse.json(
        { error: 'routeId, tripDate, and routeType are required' },
        { status: 400 }
      )
    }

    if (routeType !== 'AM' && routeType !== 'PM') {
      return NextResponse.json(
        { error: 'routeType must be AM or PM' },
        { status: 400 }
      )
    }

    const trip = await createRouteTrip({
      routeId: String(routeId).trim(),
      // Pass date-only string through; lib/actions normalizes to UTC date-only.
      tripDate: String(tripDate).trim(),
      routeType: routeType as 'AM' | 'PM',
      driverId: driverId ? String(driverId).trim() : undefined
    })

    return NextResponse.json(trip, { status: 201 })
  } catch (error) {
    console.error('Error creating trip:', error)
    if (error instanceof Error && error.message.includes('already exists')) {
      return NextResponse.json({ error: 'A trip already exists for this route/date/type.' }, { status: 409 })
    }
    const pub = toPublicError(error, 'Failed to create trip. Please try again.')
    return NextResponse.json({ error: pub.message }, { status: pub.status })
  }
}

