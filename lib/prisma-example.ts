// Example: How to use PrismaClient in your Next.js app
// 
// In API routes (app/api/example/route.ts):
// import { prisma } from '@/lib/prisma'
// 
// export async function GET() {
//   const tenants = await prisma.tenant.findMany()
//   return Response.json(tenants)
// }
//
// In Server Components (app/page.tsx):
// import { prisma } from '@/lib/prisma'
// 
// export default async function Home() {
//   const tenants = await prisma.tenant.findMany()
//   return <div>{/* render tenants */}</div>
// }
//
// In Server Actions:
// 'use server'
// import { prisma } from '@/lib/prisma'
// 
// export async function createTenant(name: string) {
//   return await prisma.tenant.create({ data: { name } })
// }

