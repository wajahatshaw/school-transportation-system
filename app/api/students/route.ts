import { NextRequest, NextResponse } from 'next/server'
import { createStudent } from '@/lib/actions'
import { getSession } from '@/lib/auth/session'

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
    let body: { firstName?: string; lastName?: string; grade?: string; routeId?: string }
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
        { error: 'Invalid JSON in request body', details: parseError instanceof Error ? parseError.message : 'Unknown error' },
        { status: 400 }
      )
    }

    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json(
        { error: 'Invalid request body format' },
        { status: 400 }
      )
    }

    const { firstName, lastName, grade, routeId } = body

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
    })

    return NextResponse.json(student, { status: 201 })
  } catch (error) {
    console.error('Error creating student:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to create student'
    
    // Check for authentication-related errors
    if (errorMessage.includes('Authentication required') || errorMessage.includes('Tenant selection required')) {
      return NextResponse.json(
        { error: errorMessage },
        { status: 401 }
      )
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}
