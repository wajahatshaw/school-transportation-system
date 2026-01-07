import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSession } from '@/lib/auth/session'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']

/**
 * Creates a Supabase admin client for server-side storage operations
 * Uses service role key to bypass RLS for storage uploads
 */
function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL is not set')
  }

  if (!serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set. Please add it to your environment variables.')
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

export async function POST(request: NextRequest) {
  try {
    // Validate authentication
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

    // Get form data
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: `File type not allowed. Allowed types: ${ALLOWED_TYPES.join(', ')}` },
        { status: 400 }
      )
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File size exceeds maximum of ${MAX_FILE_SIZE / 1024 / 1024}MB` },
        { status: 400 }
      )
    }

    // Create Supabase admin client for storage operations
    // Using service role key to bypass RLS for storage uploads
    // User authentication is still validated via getSession() above
    let supabase
    try {
      supabase = createAdminClient()
    } catch (error) {
      console.error('Failed to create admin client:', error)
      return NextResponse.json(
        { 
          error: 'Storage service not configured',
          details: error instanceof Error ? error.message : 'Please configure SUPABASE_SERVICE_ROLE_KEY in your environment variables.'
        },
        { status: 500 }
      )
    }

    // Generate unique filename
    const timestamp = Date.now()
    const randomString = Math.random().toString(36).substring(2, 15)
    const fileExt = file.name.split('.').pop()
    const fileName = `maintenance-docs/${timestamp}-${randomString}.${fileExt}`

    // Convert File to ArrayBuffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Check if bucket exists and is accessible
    const { data: buckets, error: listError } = await supabase.storage.listBuckets()
    
    if (listError) {
      console.error('Error listing buckets:', listError)
      // If we can't list buckets, try to proceed anyway - the upload will fail with a clearer error
      console.warn('Could not list buckets, proceeding with upload attempt...')
    } else {
      console.log('Available buckets:', buckets?.map(b => b.name))
    }

    // Try to find the bucket - handle both underscore and space variations
    // Supabase bucket names are case-sensitive and spaces are typically stored as underscores
    let bucketName = 'sts_assets' // Default
    
    if (buckets && buckets.length > 0) {
      // Try exact match first
      const exactMatch = buckets.find(b => b.name === 'sts_assets' || b.name === 'sts assets')
      if (exactMatch) {
        bucketName = exactMatch.name
      } else {
        // Try case-insensitive match
        const caseInsensitiveMatch = buckets.find(b => 
          b.name.toLowerCase().replace(/\s+/g, '_') === 'sts_assets'
        )
        if (caseInsensitiveMatch) {
          bucketName = caseInsensitiveMatch.name
        } else {
          // Log available buckets for debugging
          console.error('Bucket "sts_assets" not found. Available buckets:', buckets.map(b => b.name))
          return NextResponse.json(
            { 
              error: 'Storage bucket not found',
              details: `The "sts_assets" bucket was not found. Available buckets: ${buckets.map(b => b.name).join(', ')}. Please ensure the bucket name is exactly "sts_assets" (with underscore).`
            },
            { status: 404 }
          )
        }
      }
    }
    
    console.log('Using bucket:', bucketName)

    // Upload to Supabase storage
    // Use the detected bucket name or default to sts_assets
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: false,
      })

    if (error) {
      console.error('Supabase upload error:', error)
      console.error('Error details:', {
        message: error.message,
        statusCode: (error as any).statusCode,
        status: (error as any).status,
        bucketName: bucketName,
        availableBuckets: buckets?.map(b => b.name)
      })
      
      // Provide user-friendly error messages
      let errorMessage = 'Failed to upload file'
      let errorDetails = error.message
      
      if (error.message.includes('Bucket not found') || (error as any).statusCode === 404) {
        errorMessage = `Storage bucket "${bucketName}" not found or not accessible.`
        errorDetails = `Available buckets: ${buckets?.map(b => b.name).join(', ') || 'none'}. Please check that the bucket exists and has proper permissions.`
      } else if (error.message.includes('duplicate') || error.message.includes('already exists')) {
        errorMessage = 'A file with this name already exists. Please try again.'
      } else if (error.message.includes('size') || error.message.includes('too large')) {
        errorMessage = 'File size exceeds the allowed limit.'
      } else if (error.message.includes('permission') || error.message.includes('access') || error.message.includes('policy')) {
        errorMessage = 'Permission denied. Please check that the bucket has proper RLS policies configured.'
        errorDetails = 'The bucket may need to be set to public or have RLS policies that allow uploads.'
      } else {
        errorMessage = error.message || 'Failed to upload file. Please try again.'
      }
      
      return NextResponse.json(
        { error: errorMessage, details: errorDetails },
        { status: 500 }
      )
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(fileName)

    return NextResponse.json({
      url: urlData.publicUrl,
      path: data.path,
    }, { status: 200 })
  } catch (error) {
    console.error('Error uploading file:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to upload file'
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}

