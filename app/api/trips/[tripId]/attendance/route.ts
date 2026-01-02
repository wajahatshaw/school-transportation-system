import { NextRequest, NextResponse } from 'next/server'
import { getTripAttendance, markAttendance, addStudentToTrip, removeStudentFromTrip } from '@/lib/actions'
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

    const attendance = await getTripAttendance(tripId)

    return NextResponse.json(attendance, { status: 200 })
  } catch (error) {
    console.error('Error fetching attendance:', error)
    const pub = toPublicError(error, 'Failed to load attendance. Please try again.')
    return NextResponse.json({ error: pub.message }, { status: pub.status })
  }
}

export async function POST(
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

    // Parse request body
    let body: {
      action?: string
      studentId?: string
      status?: string
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

    const { tripId } = await context.params
    const { action, studentId, status } = body

    if (!studentId) {
      return NextResponse.json(
        { error: 'studentId is required' },
        { status: 400 }
      )
    }

    // Handle different actions
    if (action === 'add') {
      const result = await addStudentToTrip(tripId, studentId)
      return NextResponse.json(result, { status: 201 })
    } else if (action === 'remove') {
      const result = await removeStudentFromTrip(tripId, studentId)
      return NextResponse.json(result, { status: 200 })
    } else {
      // Default: mark attendance
      if (!status) {
        return NextResponse.json(
          { error: 'status is required for marking attendance' },
          { status: 400 }
        )
      }

      if (!['boarded', 'absent', 'no_show'].includes(status)) {
        return NextResponse.json(
          { error: 'status must be boarded, absent, or no_show' },
          { status: 400 }
        )
      }

      const result = await markAttendance(tripId, studentId, status as 'boarded' | 'absent' | 'no_show')
      return NextResponse.json(result, { status: 200 })
    }
  } catch (error) {
    console.error('Error managing attendance:', error)
    if (error instanceof Error && error.message.includes('confirmed trip')) {
      return NextResponse.json({ error: 'This trip is confirmed and cannot be modified.' }, { status: 409 })
    }
    const pub = toPublicError(error, 'Failed to update attendance. Please try again.')
    return NextResponse.json({ error: pub.message }, { status: pub.status })
  }
}

