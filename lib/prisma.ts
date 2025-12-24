import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

// PrismaClient is attached to the `global` object in development to prevent
// exhausting your database connection limit.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Global pool and adapter instances to share across requests
const globalForPool = globalThis as unknown as {
  pool: Pool | undefined
  adapter: PrismaPg | undefined
}

// Function to create Prisma client with proper error handling
function createPrismaClient() {
  // Validate that DATABASE_URL is set
  if (!process.env.DATABASE_URL) {
    throw new Error(
      'DATABASE_URL environment variable is not set. ' +
      'Please configure it in your Netlify environment variables.'
    )
  }

  // Create or reuse connection pool (singleton to prevent connection exhaustion)
  // Supabase session pooler typically allows 4-10 connections per pooler
  // We use a reasonable size to handle concurrent requests without exhausting limits
  if (!globalForPool.pool) {
    globalForPool.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 4, // Allow concurrent transactions (Supabase session pooler limit is typically higher)
      min: 0, // Allow pool to close idle connections
      idleTimeoutMillis: 30000, // Close idle connections after 30s
      connectionTimeoutMillis: 10000, // Wait up to 10s for a connection
      allowExitOnIdle: true, // Allow process to exit when pool is idle
    })
  }

  // Create or reuse adapter (reuses the same pool)
  if (!globalForPool.adapter) {
    globalForPool.adapter = new PrismaPg(globalForPool.pool)
  }

  // Create PrismaClient with shared adapter
  return new PrismaClient({
    adapter: globalForPool.adapter,
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  })
}

export const prisma =
  globalForPrisma.prisma ?? createPrismaClient()

// In production (Netlify/serverless), we still want singleton behavior
// to prevent connection exhaustion
if (!globalForPrisma.prisma) {
  globalForPrisma.prisma = prisma
}

