import { NextRequest, NextResponse } from 'next/server'
import { getInvoices, createInvoice } from '@/lib/actions'
import { getSession } from '@/lib/auth/session'
import { toPublicError } from '@/lib/api/public-errors'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
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

    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status') || undefined
    const startDate = searchParams.get('startDate') ? new Date(searchParams.get('startDate')!) : undefined
    const endDate = searchParams.get('endDate') ? new Date(searchParams.get('endDate')!) : undefined
    const search = searchParams.get('search') || undefined

    const invoices = await getInvoices({
      status,
      startDate,
      endDate,
      search
    })

    return NextResponse.json({ data: invoices })
  } catch (error) {
    console.error('Error fetching invoices:', error)
    return NextResponse.json(
      toPublicError(error, 'Failed to fetch invoices'),
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
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
    const { status, issueDate, dueDate, subtotal, tax, total, notes, lineItems } = body

    if (!issueDate || !dueDate || subtotal === undefined || total === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: issueDate, dueDate, subtotal, total' },
        { status: 400 }
      )
    }

    if (!Array.isArray(lineItems) || lineItems.length === 0) {
      return NextResponse.json(
        { error: 'At least one line item is required' },
        { status: 400 }
      )
    }

    const invoice = await createInvoice({
      status: status || 'draft',
      issueDate: new Date(issueDate),
      dueDate: new Date(dueDate),
      subtotal: Number(subtotal),
      tax: tax !== undefined ? Number(tax) : undefined,
      total: Number(total),
      notes: notes || undefined,
      lineItems: lineItems.map((item: any) => ({
        itemType: item.itemType,
        routeId: item.routeId || undefined,
        studentId: item.studentId || undefined,
        description: item.description,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
        total: Number(item.total)
      }))
    })

    return NextResponse.json({ data: invoice }, { status: 201 })
  } catch (error) {
    console.error('Error creating invoice:', error)
    return NextResponse.json(
      toPublicError(error, 'Failed to create invoice'),
      { status: 500 }
    )
  }
}
