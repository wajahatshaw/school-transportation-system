import { NextRequest, NextResponse } from 'next/server'
import { recordPayment } from '@/lib/actions'
import { getSession } from '@/lib/auth/session'
import { toPublicError } from '@/lib/api/public-errors'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(
  request: NextRequest,
  { params }: { params: { invoiceId: string } }
) {
  try {
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

    const text = await request.text()
    if (!text || text.trim() === '') {
      return NextResponse.json(
        { error: 'Request body is required' },
        { status: 400 }
      )
    }

    const body = JSON.parse(text)
    const { amount, paymentDate, paymentMethod, referenceNumber, notes } = body

    if (!amount || !paymentDate || !paymentMethod) {
      return NextResponse.json(
        { error: 'Missing required fields: amount, paymentDate, paymentMethod' },
        { status: 400 }
      )
    }

    const payment = await recordPayment(params.invoiceId, {
      amount: Number(amount),
      paymentDate: new Date(paymentDate),
      paymentMethod,
      referenceNumber: referenceNumber || undefined,
      notes: notes || undefined
    })

    return NextResponse.json({ data: payment }, { status: 201 })
  } catch (error) {
    console.error('Error recording payment:', error)
    return NextResponse.json(
      toPublicError(error, 'Failed to record payment'),
      { status: 500 }
    )
  }
}
