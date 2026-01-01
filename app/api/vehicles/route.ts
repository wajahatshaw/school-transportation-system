import { NextRequest, NextResponse } from 'next/server'
import { createVehicle } from '@/lib/actions'
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
    // Use text() then parse manually - more reliable on Netlify than request.json()
    let body: { name?: string; capacity?: number; licensePlate?: string; vehicleType?: string }
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

    const { name, capacity, licensePlate, vehicleType } = body

    if (!name || !capacity) {
      return NextResponse.json(
        { error: 'Name and capacity are required' },
        { status: 400 }
      )
    }

    if (typeof capacity !== 'number' || capacity <= 0) {
      return NextResponse.json(
        { error: 'Capacity must be a positive number' },
        { status: 400 }
      )
    }

    if (capacity > 60) {
      return NextResponse.json(
        { error: 'Capacity cannot be more than 60' },
        { status: 400 }
      )
    }

    const vehicle = await createVehicle({
      name: String(name).trim(),
      capacity: Number(capacity),
      licensePlate: licensePlate ? String(licensePlate).trim() : undefined,
      vehicleType: vehicleType ? String(vehicleType).trim() : undefined,
    })

    return NextResponse.json(vehicle, { status: 201 })
  } catch (error) {
    console.error('Error creating vehicle:', error)
    const pub = toPublicError(error, 'Failed to add vehicle. Please try again.')
    return NextResponse.json({ error: pub.message }, { status: pub.status })
  }
}

