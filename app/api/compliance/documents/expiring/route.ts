import { NextRequest, NextResponse } from 'next/server'
import { evaluateDriver } from '@/lib/compliance/rules'
import { withTenantContext, getTenantContext } from '@/lib/withTenantContext'

export async function GET(request: NextRequest) {
  try {
    const context = await getTenantContext()
    const searchParams = request.nextUrl.searchParams
    const filter = searchParams.get('filter') || 'all' // 'all' | 'expired' | 'expiring'
    const search = searchParams.get('search')
    
    // Get all drivers first (inside transaction)
    const drivers = await withTenantContext(context, async (tx) => {
      let driversQuery = `SELECT id, first_name, last_name, email, license_number FROM app.v_drivers WHERE deleted_at IS NULL`
      const params: any[] = []
      let paramIndex = 1
      
      if (search) {
        driversQuery += ` AND (first_name ILIKE $${paramIndex} OR last_name ILIKE $${paramIndex} OR email ILIKE $${paramIndex})`
        params.push(`%${search}%`)
        paramIndex++
      }
      
      driversQuery += ` ORDER BY last_name, first_name`
      
      return await tx.$queryRawUnsafe<Array<{
        id: string
        first_name: string
        last_name: string
        email: string | null
        license_number: string | null
      }>>(driversQuery, ...params)
    })
    
    // Evaluate each driver's compliance in batches
    const batchSize = 5
    const allDocuments: Array<{
      docId: string
      driverId: string
      driver: {
        id: string
        firstName: string
        lastName: string
        email: string | null
        licenseNumber: string | null
      }
      docType: string
      expiresAt: Date
      daysUntilExpiry: number
      status: 'expired' | 'expiring' | 'valid'
      isRequired: boolean
    }> = []
    
    for (let i = 0; i < drivers.length; i += batchSize) {
      const batch = drivers.slice(i, i + batchSize)
      const batchResults = await Promise.all(
        batch.map(async (d) => {
          try {
            const evaluation = await evaluateDriver(d.id)
            return {
              driver: {
                id: d.id,
                firstName: d.first_name,
                lastName: d.last_name,
                email: d.email,
                licenseNumber: d.license_number
              },
              evaluation
            }
          } catch (error) {
            console.error(`Error evaluating driver ${d.id}:`, error)
            return null
          }
        })
      )
      
      // Extract documents from evaluations
      for (const result of batchResults) {
        if (!result) continue
        
        for (const doc of result.evaluation.documents) {
          // Only include expired or expiring documents that are REQUIRED
          // This matches the logic in evaluateTenant() and getDocumentsForAlerts()
          if ((doc.status === 'expired' || doc.status === 'expiring') && doc.isRequired) {
            allDocuments.push({
              docId: doc.docId,
              driverId: result.driver.id,
              driver: result.driver,
              docType: doc.docType,
              expiresAt: new Date(doc.expiresAt),
              daysUntilExpiry: doc.daysUntilExpiry,
              status: doc.status,
              isRequired: doc.isRequired
            })
          }
        }
      }
    }
    
    // Apply filter - ensure we're filtering correctly
    let filteredDocuments = allDocuments
    const normalizedFilter = filter?.toLowerCase().trim() || 'all'
    
    if (normalizedFilter === 'expired') {
      filteredDocuments = allDocuments.filter(doc => doc.status === 'expired')
    } else if (normalizedFilter === 'expiring') {
      filteredDocuments = allDocuments.filter(doc => doc.status === 'expiring')
    }
    // If filter is 'all', show all documents (no filtering needed)
    
    // Sort: expired first, then by days until expiry
    filteredDocuments.sort((a, b) => {
      if (a.status === 'expired' && b.status !== 'expired') return -1
      if (a.status !== 'expired' && b.status === 'expired') return 1
      return a.daysUntilExpiry - b.daysUntilExpiry
    })
    
    // Calculate counts from all documents (not filtered) for the filter buttons
    const expiredCount = allDocuments.filter(d => d.status === 'expired').length
    const expiringCount = allDocuments.filter(d => d.status === 'expiring').length
    
    return NextResponse.json({
      success: true,
      data: filteredDocuments,
      total: filteredDocuments.length,
      expired: expiredCount,
      expiring: expiringCount
    })
  } catch (error) {
    console.error('Error fetching expiring documents:', error)
    
    let userMessage = 'Unable to load expiring documents at this time.'
    let statusCode = 500
    
    if (error instanceof Error) {
      if (error.message.includes('timeout') || error.message.includes('timeout exceeded')) {
        userMessage = 'The request took too long to complete. Please try again or contact support if the issue persists.'
        statusCode = 504
      } else if (error.message.includes('connection') || error.message.includes('connect')) {
        userMessage = 'Unable to connect to the database. Please try again in a moment.'
        statusCode = 503
      } else if (error.message.includes('pool')) {
        userMessage = 'The system is currently busy. Please try again in a few moments.'
        statusCode = 503
      }
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: userMessage,
        ...(process.env.NODE_ENV === 'development' && {
          details: error instanceof Error ? error.message : 'Unknown error'
        })
      },
      { status: statusCode }
    )
  }
}

