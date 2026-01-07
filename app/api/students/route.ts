import { NextRequest, NextResponse } from 'next/server'
import { createStudent } from '@/lib/actions'
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
    let body: {
      firstName?: string
      lastName?: string
      grade?: string
      studentAddress?: string
      morningPickupTime?: string
      morningDropTime?: string
      afternoonPickupTime?: string
      afternoonDropTime?: string
      guardianName?: string
      guardianPhone?: string
      schoolName?: string
      schoolAddress?: string
      schoolPhone?: string
      vehicleId?: string
      driverId?: string
      routeId?: string
      serialNo?: string
      runId?: string
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

    const {
      firstName,
      lastName,
      grade,
      studentAddress,
      morningPickupTime,
      morningDropTime,
      afternoonPickupTime,
      afternoonDropTime,
      guardianName,
      guardianPhone,
      schoolName,
      schoolAddress,
      schoolPhone,
      vehicleId,
      driverId,
      routeId,
      serialNo,
      runId,
    } = body

    if (!firstName || !lastName) {
      return NextResponse.json(
        { error: 'First name and last name are required' },
        { status: 400 }
      )
    }

    const student = await createStudent({
      firstName: String(firstName).trim(),
      lastName: String(lastName).trim(),
      grade: grade ? String(grade).trim() : undefined,
      routeId: routeId ? String(routeId).trim() : undefined,
      studentAddress: studentAddress ? String(studentAddress).trim() : undefined,
      morningPickupTime: morningPickupTime ? String(morningPickupTime).trim() : undefined,
      morningDropTime: morningDropTime ? String(morningDropTime).trim() : undefined,
      afternoonPickupTime: afternoonPickupTime ? String(afternoonPickupTime).trim() : undefined,
      afternoonDropTime: afternoonDropTime ? String(afternoonDropTime).trim() : undefined,
      guardianName: guardianName ? String(guardianName).trim() : undefined,
      guardianPhone: guardianPhone ? String(guardianPhone).trim() : undefined,
      schoolName: schoolName ? String(schoolName).trim() : undefined,
      schoolAddress: schoolAddress ? String(schoolAddress).trim() : undefined,
      schoolPhone: schoolPhone ? String(schoolPhone).trim() : undefined,
      vehicleId: vehicleId ? String(vehicleId).trim() : undefined,
      driverId: driverId ? String(driverId).trim() : undefined,
      serialNo: serialNo ? String(serialNo).trim() : undefined,
      runId: runId ? String(runId).trim() : undefined,
    })

    return NextResponse.json(student, { status: 201 })
  } catch (error) {
    console.error('Error creating student:', error)
    const pub = toPublicError(error, 'Failed to add student. Please try again.')
    return NextResponse.json({ error: pub.message }, { status: pub.status })
  }
}
