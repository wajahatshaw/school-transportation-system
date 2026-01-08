import { NextResponse } from 'next/server'
import { evaluateTenant } from '@/lib/compliance/rules'

export async function GET() {
  try {
    // Add timeout wrapper (increased to 60 seconds for large datasets)
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Request timeout')), 60000) // 60 second timeout
    })
    
    const evaluation = await Promise.race([
      evaluateTenant(),
      timeoutPromise
    ]) as Awaited<ReturnType<typeof evaluateTenant>>
    
    return NextResponse.json({
      success: true,
      data: evaluation
    })
  } catch (error) {
    console.error('Error fetching compliance summary:', error)
    
    // User-friendly error messages
    let userMessage = 'Unable to load compliance summary at this time.'
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

