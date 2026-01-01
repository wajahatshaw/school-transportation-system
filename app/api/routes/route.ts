import { NextRequest, NextResponse } from 'next/server'
import { createRoute } from '@/lib/actions'
import { getSession } from '@/lib/auth/session'
import { toPublicError } from '@/lib/api/public-errors'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

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

    // Check if request exists and is valid
    if (!request) {
      return NextResponse.json(
        { error: 'Invalid request' },
        { status: 400 }
      )
    }

    // Parse request body with proper error handling for Netlify compatibility
    let body: { 
      name?: string
      type?: string
      vehicleId?: string
      driverId?: string
      stops?: any
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
        { error: 'Invalid request body. Please try again.' },
        { status: 400 }
      )
    }

    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json(
        { error: 'Invalid request body format' },
        { status: 400 }
      )
    }

    const { name, type, vehicleId, driverId, stops } = body

    if (!name || !type) {
      return NextResponse.json(
        { error: 'Name and type are required' },
        { status: 400 }
      )
    }

    if (type !== 'AM' && type !== 'PM') {
      return NextResponse.json(
        { error: 'Type must be AM or PM' },
        { status: 400 }
      )
    }

    const route = await createRoute({
      name: String(name).trim(),
      type: type as 'AM' | 'PM',
      vehicleId: vehicleId ? String(vehicleId).trim() : undefined,
      driverId: driverId ? String(driverId).trim() : undefined,
      stops: stops || [],
    })

    return NextResponse.json(route, { status: 201 })
  } catch (error) {
    console.error('Error creating route:', error)
    const pub = toPublicError(error, 'Failed to add route. Please try again.')
    return NextResponse.json({ error: pub.message }, { status: pub.status })
  }
}

