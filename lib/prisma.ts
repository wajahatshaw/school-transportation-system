import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

// PrismaClient is attached to the `global` object in development to prevent
// exhausting your database connection limit.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
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

  // Create a connection pool
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  })

  // Create the adapter
  const adapter = new PrismaPg(pool)

  // Create PrismaClient with adapter
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })
}

export const prisma =
  globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

