import { NextRequest, NextResponse } from 'next/server'
import { evaluateDriversBatch } from '@/lib/compliance/rules'
import { withTenantContext, getTenantContext } from '@/lib/withTenantContext'

export async function GET(request: NextRequest) {
  try {
    const context = await getTenantContext()
    const searchParams = request.nextUrl.searchParams
    const driverId = searchParams.get('driverId')
    const status = searchParams.get('status') // 'compliant' | 'non_compliant' | 'all'
    const search = searchParams.get('search')
    
    // Get all drivers first (inside transaction)
    const drivers = await withTenantContext(context, async (tx) => {
      let driversQuery = `SELECT id, first_name, last_name, email, license_number FROM app.v_drivers WHERE deleted_at IS NULL`
      const params: any[] = []
      let paramIndex = 1
      
      if (search) {
        // Improved search: check individual fields AND combined full name
        // Also split search term to match parts across first_name and last_name
        const searchPattern = `%${search}%`
        const searchTerms = search.trim().split(/\s+/).filter(term => term.length > 0)
        
        if (searchTerms.length > 1) {
          // Multiple words: check if they match first_name and last_name in any order
          // e.g., "jack 02" matches first_name="Jack" AND last_name="02" (or vice versa)
          const conditions: string[] = []
          
          // Check full search term against combined names
          conditions.push(`CONCAT(first_name, ' ', last_name) ILIKE $${paramIndex}`)
          conditions.push(`CONCAT(last_name, ' ', first_name) ILIKE $${paramIndex}`)
          
          // Check individual fields
          conditions.push(`first_name ILIKE $${paramIndex}`)
          conditions.push(`last_name ILIKE $${paramIndex}`)
          conditions.push(`email ILIKE $${paramIndex}`)
          conditions.push(`license_number ILIKE $${paramIndex}`)
          
          // Check if search terms match first_name and last_name separately
          // e.g., "jack 02" -> (first_name ILIKE '%jack%' AND last_name ILIKE '%02%') OR (first_name ILIKE '%02%' AND last_name ILIKE '%jack%')
          const term1 = `%${searchTerms[0]}%`
          const term2 = `%${searchTerms[1]}%`
          conditions.push(`(first_name ILIKE $${paramIndex + 1} AND last_name ILIKE $${paramIndex + 2})`)
          conditions.push(`(first_name ILIKE $${paramIndex + 2} AND last_name ILIKE $${paramIndex + 1})`)
          
          driversQuery += ` AND (${conditions.join(' OR ')})`
          params.push(searchPattern, term1, term2)
          paramIndex += 3
        } else {
          // Single word: simple search across all fields
          driversQuery += ` AND (
            first_name ILIKE $${paramIndex} 
            OR last_name ILIKE $${paramIndex} 
            OR email ILIKE $${paramIndex}
            OR license_number ILIKE $${paramIndex}
            OR CONCAT(first_name, ' ', last_name) ILIKE $${paramIndex}
            OR CONCAT(last_name, ' ', first_name) ILIKE $${paramIndex}
          )`
          params.push(searchPattern)
          paramIndex++
        }
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
    
    // OPTIMIZED: Evaluate all drivers in one batch query instead of per-driver
    const driverIds = drivers.map(d => d.id)
    const evaluationsMap = await evaluateDriversBatch(driverIds)
    
    // Convert map to array
    const evaluations = Array.from(evaluationsMap.values())
    
    // Filter by driverId if provided
    let filteredEvaluations = driverId
      ? evaluations.filter(e => e.driverId === driverId)
      : evaluations
    
    // Filter by status if provided
    if (status === 'compliant') {
      filteredEvaluations = filteredEvaluations.filter(e => Boolean(e.compliant) === true)
    } else if (status === 'non_compliant') {
      filteredEvaluations = filteredEvaluations.filter(e => Boolean(e.compliant) === false)
    }
    
    // Combine driver info with compliance evaluation
    const results = filteredEvaluations.map(driverEval => {
      const driver = drivers.find(d => d.id === driverEval.driverId)
      return {
        driverId: driverEval.driverId,
        driver: driver ? {
          id: driver.id,
          firstName: driver.first_name,
          lastName: driver.last_name,
          email: driver.email,
          licenseNumber: driver.license_number
        } : null,
        compliant: driverEval.compliant,
        complianceScore: driverEval.complianceScore,
        expiredCount: driverEval.expiredCount,
        expiringCount: driverEval.expiringCount,
        missingCount: driverEval.missingCount,
        missingRequiredDocs: driverEval.missingRequiredDocs,
        documents: driverEval.documents
      }
    })
    
    return NextResponse.json({
      success: true,
      data: results,
      total: results.length
    })
  } catch (error) {
    console.error('Error fetching driver compliance:', error)
    
    // User-friendly error messages
    let userMessage = 'Unable to load driver compliance data at this time.'
    let statusCode = 500
    
    if (error instanceof Error) {
      const errorMsg = error.message.toLowerCase()
      if (errorMsg.includes('timeout') || errorMsg.includes('timeout exceeded')) {
        userMessage = 'The request took too long to complete. Please try again or contact support if the issue persists.'
        statusCode = 504 // Gateway Timeout
      } else if (errorMsg.includes('connection') || errorMsg.includes('connect') || errorMsg.includes('econnrefused')) {
        userMessage = 'Unable to connect to the database. Please try again in a moment.'
        statusCode = 503 // Service Unavailable
      } else if (errorMsg.includes('pool') || errorMsg.includes('p2028')) {
        userMessage = 'The system is currently busy. Please try again in a few moments.'
        statusCode = 503
      } else if (errorMsg.includes('permission') || errorMsg.includes('access')) {
        userMessage = 'You do not have permission to access this data.'
        statusCode = 403
      } else {
        // Include the actual error message in development
        if (process.env.NODE_ENV === 'development') {
          userMessage = error.message
        }
      }
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: userMessage,
        // Include detailed error in development only
        ...(process.env.NODE_ENV === 'development' && {
          details: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        })
      },
      { status: statusCode }
    )
  }
}

