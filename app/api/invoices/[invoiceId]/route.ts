import { NextRequest, NextResponse } from 'next/server'
import { getInvoice, updateInvoice, cancelInvoice } from '@/lib/actions'
import { getSession } from '@/lib/auth/session'
import { toPublicError } from '@/lib/api/public-errors'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ invoiceId: string }> }
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

    const { invoiceId } = await params
    const invoice = await getInvoice(invoiceId)

    if (!invoice) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ data: invoice })
  } catch (error) {
    console.error('Error fetching invoice:', error)
    return NextResponse.json(
      toPublicError(error, 'Failed to fetch invoice'),
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ invoiceId: string }> }
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

    const { invoiceId } = await params
    const text = await request.text()
    if (!text || text.trim() === '') {
      return NextResponse.json(
        { error: 'Request body is required' },
        { status: 400 }
      )
    }

    const body = JSON.parse(text)
    const updateData: any = {}

    if (body.status !== undefined) updateData.status = body.status
    if (body.issueDate !== undefined) updateData.issueDate = new Date(body.issueDate)
    if (body.dueDate !== undefined) updateData.dueDate = new Date(body.dueDate)
    if (body.subtotal !== undefined) updateData.subtotal = Number(body.subtotal)
    if (body.tax !== undefined) updateData.tax = Number(body.tax)
    if (body.total !== undefined) updateData.total = Number(body.total)
    if (body.notes !== undefined) updateData.notes = body.notes
    if (body.lineItems !== undefined) updateData.lineItems = body.lineItems

    const invoice = await updateInvoice(invoiceId, updateData)

    return NextResponse.json({ data: invoice })
  } catch (error) {
    console.error('Error updating invoice:', error)
    return NextResponse.json(
      toPublicError(error, 'Failed to update invoice'),
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ invoiceId: string }> }
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

    const { invoiceId } = await params
    const invoice = await cancelInvoice(invoiceId)

    return NextResponse.json({ data: invoice })
  } catch (error) {
    console.error('Error cancelling invoice:', error)
    return NextResponse.json(
      toPublicError(error, 'Failed to cancel invoice'),
      { status: 500 }
    )
  }
}
