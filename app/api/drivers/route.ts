import { NextRequest, NextResponse } from 'next/server'
import { createDriver } from '@/lib/actions'
import { getSession } from '@/lib/auth/session'
import { createAdminClient, createAnonClient } from '@/lib/supabase/admin'
import { prisma } from '@/lib/prisma'
import { getOrCreateInternalUser } from '@/lib/auth/session'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function findAuthUserByEmail(
  admin: ReturnType<typeof createAdminClient>,
  email: string
): Promise<any | null> {
  // Supabase Admin API doesn't provide a direct "get user by email".
  // We page through listUsers to find a match.
  const perPage = 1000
  for (let page = 1; page <= 10; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage })
    if (error) throw error
    const users = data.users || []
    const match = users.find((u) => (u.email || '').trim().toLowerCase() === email)
    if (match) return match
    if (users.length < perPage) break
  }
  return null
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

    // Check if request exists and is valid
    if (!request) {
      return NextResponse.json(
        { error: 'Invalid request' },
        { status: 400 }
      )
    }

    // Parse request body with proper error handling for Netlify compatibility
    // Use text() then parse manually - more reliable on Netlify than request.json()
    let body: { firstName?: string; lastName?: string; licenseNumber?: string; email?: string }
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

    const { firstName, lastName, licenseNumber, email } = body

    if (!firstName || !lastName || !email) {
      return NextResponse.json(
        { error: 'First name, last name, and email are required' },
        { status: 400 }
      )
    }

    const emailStr = String(email).trim().toLowerCase()
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailStr)
    if (!emailOk) {
      return NextResponse.json(
        { error: 'Please provide a valid email address' },
        { status: 400 }
      )
    }

    // Prevent duplicate active driver records in this tenant BEFORE creating auth user / sending invite.
    // (Drivers are soft-deleted, so we only block duplicates where deletedAt is null.)
    const existingDriver = await prisma.driver.findFirst({
      where: {
        tenantId: session.tenantId,
        email: emailStr,
        deletedAt: null,
      },
      select: { id: true },
    })
    if (existingDriver) {
      return NextResponse.json(
        { error: 'A driver with this email already exists.' },
        { status: 409 }
      )
    }

    // Always send invite links to a dedicated page that can consume the invite token
    // and let the driver set their first password.
    const redirectTo = `${request.nextUrl.origin}/auth/invite`

    // 1) Invite driver auth user via Supabase (email contains set-password flow)
    const admin = createAdminClient()
    const anon = createAnonClient()

    let authUserId: string | null = null
    let authWasInvited = false

    const inviteRes = await admin.auth.admin.inviteUserByEmail(emailStr, {
      redirectTo,
      data: {
        role: 'driver',
        tenantId: session.tenantId,
      },
    })

    if (inviteRes.error) {
      // If the user already exists (often from a previous invite), prefer re-sending
      // an INVITE email (set-password flow) rather than a reset-password email.
      const msg = inviteRes.error.message || ''
      const alreadyExists = msg.toLowerCase().includes('already') || msg.toLowerCase().includes('registered')
      if (!alreadyExists) {
        console.error('Supabase invite error:', inviteRes.error)
        return NextResponse.json(
          { error: 'Failed to invite driver. Please try again.' },
          { status: 502 }
        )
      }

      try {
        const match = await findAuthUserByEmail(admin, emailStr)
        authUserId = match?.id ?? null

        // If they have never signed in, we can safely delete + re-invite to force the Invite email.
        const hasSignedIn = !!(match as any)?.last_sign_in_at
        if (authUserId && !hasSignedIn) {
          await admin.auth.admin.deleteUser(authUserId)
          const reInviteRes = await admin.auth.admin.inviteUserByEmail(emailStr, {
            redirectTo,
            data: {
              role: 'driver',
              tenantId: session.tenantId,
            },
          })
          if (reInviteRes.error) throw reInviteRes.error
          authUserId = reInviteRes.data.user?.id ?? null
          authWasInvited = true
        } else {
          // DO NOT send reset-password here (you requested invite/set-password only).
          // If the auth account already exists and has signed in, the correct action is
          // "reset password". We return a clear error so you can handle this case later.
          return NextResponse.json(
            { error: 'This email already has an active auth account. Use password reset (or delete the auth user to re-invite).' },
            { status: 409 }
          )
        }
      } catch (lookupError) {
        console.error('Supabase re-invite fallback failed:', lookupError)
        return NextResponse.json(
          { error: 'Failed to send set-password email. Please try again.' },
          { status: 502 }
        )
      }
    } else {
      authUserId = inviteRes.data.user?.id ?? null
      authWasInvited = true
    }

    if (!authUserId) {
      return NextResponse.json(
        { error: 'Failed to determine auth user id for invited driver.' },
        { status: 502 }
      )
    }

    // 2) Only after auth email was triggered successfully, create the driver record in DB
    let driver
    try {
      driver = await createDriver({
        firstName: String(firstName).trim(),
        lastName: String(lastName).trim(),
        email: emailStr,
        authUserId,
        licenseNumber: licenseNumber ? String(licenseNumber).trim() : undefined,
      })
    } catch (dbError) {
      // Handle duplicate email (unique index) cleanly
      const msg = dbError instanceof Error ? dbError.message : ''
      if (msg.includes('P2002') || msg.toLowerCase().includes('uniq_drivers_tenant_email_active')) {
        return NextResponse.json(
          { error: 'A driver with this email already exists.' },
          { status: 409 }
        )
      }
      // Best-effort rollback: avoid orphan invited auth user if DB write fails
      if (authWasInvited && authUserId) {
        try {
          await admin.auth.admin.deleteUser(authUserId)
        } catch (rollbackError) {
          console.error('Failed to rollback Supabase auth user after DB error:', rollbackError)
        }
      }
      throw dbError
    }

    // 3) Create internal user + membership (role=driver) linked to the driver record
    // This allows the driver to be treated as an app user later (tenant selection, RBAC),
    // while still storing driver profile data in `drivers`.
    const internalUser = await getOrCreateInternalUser(authUserId, emailStr)
    // NOTE: Prisma types can lag behind schema changes in some dev environments.
    // We use a narrow `as any` cast here to avoid blocking the build while still
    // executing a safe upsert at runtime.
    await (prisma.membership as any).upsert({
      where: {
        userId_tenantId: {
          userId: internalUser.id,
          tenantId: session.tenantId,
        },
      },
      update: {
        role: 'driver',
        driverId: driver.id,
      },
      create: {
        userId: internalUser.id,
        tenantId: session.tenantId,
        role: 'driver',
        driverId: driver.id,
      },
    })

    return NextResponse.json(
      {
        driver,
        auth: {
          authUserId,
          emailSentTo: emailStr,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating driver:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to create driver'
    
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
