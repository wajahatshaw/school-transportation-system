import { NextRequest, NextResponse } from 'next/server'
import { evaluateDriver } from '@/lib/compliance/rules'
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
    
    // Evaluate each driver's compliance in batches to avoid transaction pool exhaustion
    // Process in batches of 5 to avoid overwhelming the connection pool
    const batchSize = 5
    const evaluations: Array<{
      driverId: string
      compliant: boolean
      complianceScore: number
      expiredCount: number
      expiringCount: number
      missingCount: number
      documents: any[]
      missingRequiredDocs: string[]
    }> = []
    
    for (let i = 0; i < drivers.length; i += batchSize) {
      const batch = drivers.slice(i, i + batchSize)
      const batchResults = await Promise.all(
        batch.map(async (d) => {
          try {
            return await evaluateDriver(d.id)
          } catch (error) {
            console.error(`Error evaluating driver ${d.id}:`, error)
            // Return a default non-compliant evaluation if evaluation fails
            return {
              driverId: d.id,
              compliant: false,
              complianceScore: 0,
              expiredCount: 0,
              expiringCount: 0,
              missingCount: 0,
              documents: [],
              missingRequiredDocs: []
            }
          }
        })
      )
      evaluations.push(...batchResults)
    }
    
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

