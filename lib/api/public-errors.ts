import { Prisma } from '@prisma/client'

export type PublicError = { status: number; message: string }

export function toPublicError(error: unknown, fallbackMessage: string): PublicError {
  // Prisma known request error (e.g. unique constraint)
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      const target = (error.meta as any)?.target
      const fields = Array.isArray(target) ? target.join(', ') : String(target || '')

      // Provide a friendlier message for common unique constraints
      if (fields.toLowerCase().includes('email')) {
        return { status: 409, message: 'This email is already in use. Please use a different email.' }
      }
      return { status: 409, message: 'A record with the same unique value already exists.' }
    }

    return { status: 400, message: 'Request could not be completed. Please verify your input and try again.' }
  }

  // Common “known” messages from our auth/session helpers
  if (error instanceof Error) {
    const msg = error.message || ''
    if (msg.includes('Authentication required')) return { status: 401, message: 'Authentication required.' }
    if (msg.includes('Tenant selection required')) return { status: 403, message: 'Please select a tenant to continue.' }
    if (msg.toLowerCase().includes('not found')) return { status: 404, message: 'Requested record was not found.' }
  }

  return { status: 500, message: fallbackMessage }
}


