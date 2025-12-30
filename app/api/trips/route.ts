import { NextRequest, NextResponse } from 'next/server'
import { createRouteTrip, getRouteTrips } from '@/lib/actions'
import { getSession } from '@/lib/auth/session'

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
    const startDate = searchParams.get('startDate') 
      ? new Date(searchParams.get('startDate')!) 
      : undefined
    const endDate = searchParams.get('endDate') 
      ? new Date(searchParams.get('endDate')!) 
      : undefined
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
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch trips'
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
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
      tripDate: new Date(tripDate),
      routeType: routeType as 'AM' | 'PM',
      driverId: driverId ? String(driverId).trim() : undefined
    })

    return NextResponse.json(trip, { status: 201 })
  } catch (error) {
    console.error('Error creating trip:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to create trip'
    
    if (errorMessage.includes('already exists')) {
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

