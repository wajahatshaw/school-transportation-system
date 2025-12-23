'use server'

import { PrismaClient } from '@prisma/client'
import { revalidatePath } from 'next/cache'
import { withTenantContext, getTenantContext, TenantContext } from './withTenantContext'

// ============================================================================
// STUDENT CRUD - All operations rely on RLS, no tenantId filtering
// ============================================================================

export async function getStudents() {
  const context = await getTenantContext()
  
  return await withTenantContext(context, async (tx) => {
    // RLS automatically filters by tenant_id and excludes deleted_at IS NOT NULL rows
    // No need to add where: { tenantId } or where: { deletedAt: null }
    return await tx.student.findMany({
      orderBy: { createdAt: 'desc' }
    })
  })
}

export async function createStudent(data: { firstName: string; lastName: string; grade?: string }) {
  const context = await getTenantContext()
  
  return await withTenantContext(context, async (tx) => {
    const student = await tx.student.create({
      data: {
        tenantId: context.tenantId,
        firstName: data.firstName,
        lastName: data.lastName,
        grade: data.grade
      }
    })
    
    // Revalidate both the students page and dashboard
    revalidatePath('/dashboard/students')
    revalidatePath('/dashboard')
    revalidatePath('/dashboard/audit-logs')
    
    return student
  })
}

export async function updateStudent(id: string, data: { firstName: string; lastName: string; grade?: string }) {
  const context = await getTenantContext()
  
  return await withTenantContext(context, async (tx) => {
    // RLS ensures we can only update our tenant's records
    // No need to check tenantId in where clause
    const student = await tx.student.update({
      where: { id },
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        grade: data.grade
      }
    })
    
    // Revalidate both the students page and dashboard
    revalidatePath('/dashboard/students')
    revalidatePath('/dashboard')
    revalidatePath('/dashboard/audit-logs')
    
    return student
  })
}

export async function softDeleteStudent(id: string) {
  const context = await getTenantContext()
  
  return await withTenantContext(context, async (tx) => {
    // RLS ensures we can only soft delete our tenant's records
    const student = await tx.student.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deletedBy: context.userId
      }
    })
    
    // Revalidate both the students page and dashboard
    revalidatePath('/dashboard/students')
    revalidatePath('/dashboard')
    revalidatePath('/dashboard/audit-logs')
    
    return student
  })
}

// ============================================================================
// DRIVER CRUD - All operations rely on RLS
// ============================================================================

export async function getDrivers() {
  const context = await getTenantContext()
  
  return await withTenantContext(context, async (tx) => {
    // RLS automatically filters by tenant_id and excludes deleted_at IS NOT NULL rows
    // No need to add where: { tenantId } or where: { deletedAt: null }
    return await tx.driver.findMany({
      orderBy: { createdAt: 'desc' }
    })
  })
}

export async function createDriver(data: { firstName: string; lastName: string; licenseNumber?: string }) {
  const context = await getTenantContext()
  
  return await withTenantContext(context, async (tx) => {
    const driver = await tx.driver.create({
      data: {
        tenantId: context.tenantId,
        firstName: data.firstName,
        lastName: data.lastName,
        licenseNumber: data.licenseNumber
      }
    })
    
    revalidatePath('/dashboard/drivers')
    revalidatePath('/dashboard')
    revalidatePath('/dashboard/audit-logs')
    
    return driver
  })
}

export async function updateDriver(id: string, data: { firstName: string; lastName: string; licenseNumber?: string }) {
  const context = await getTenantContext()
  
  return await withTenantContext(context, async (tx) => {
    const driver = await tx.driver.update({
      where: { id },
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        licenseNumber: data.licenseNumber
      }
    })
    
    revalidatePath('/dashboard/drivers')
    revalidatePath('/dashboard')
    revalidatePath('/dashboard/audit-logs')
    
    return driver
  })
}

export async function deleteDriver(id: string) {
  const context = await getTenantContext()
  
  return await withTenantContext(context, async (tx) => {
    const driver = await tx.driver.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deletedBy: context.userId
      }
    })
    
    revalidatePath('/dashboard/drivers')
    revalidatePath('/dashboard')
    revalidatePath('/dashboard/audit-logs')
    
    return driver
  })
}

// ============================================================================
// COMPLIANCE DOCUMENTS CRUD
// ============================================================================

export async function getComplianceDocuments(driverId: string) {
  const context = await getTenantContext()
  
  return await withTenantContext(context, async (tx) => {
    // RLS ensures we only see our tenant's documents
    // Filter out soft-deleted documents
    return await tx.driverComplianceDocument.findMany({
      where: {
        driverId,
        deletedAt: null
      },
      orderBy: { expiresAt: 'asc' }
    })
  })
}

export async function createComplianceDocument(data: {
  driverId: string
  docType: string
  issuedAt?: Date
  expiresAt: Date
  fileUrl?: string
}) {
  const context = await getTenantContext()
  
  return await withTenantContext(context, async (tx) => {
    const doc = await tx.driverComplianceDocument.create({
      data: {
        tenantId: context.tenantId,
        driverId: data.driverId,
        docType: data.docType,
        issuedAt: data.issuedAt,
        expiresAt: data.expiresAt,
        fileUrl: data.fileUrl
      }
    })
    
    revalidatePath(`/dashboard/drivers/${data.driverId}/compliance`)
    revalidatePath('/dashboard/compliance')
    revalidatePath('/dashboard')
    revalidatePath('/dashboard/audit-logs')
    
    return doc
  })
}

export async function updateComplianceDocument(
  id: string,
  data: { docType: string; issuedAt?: Date; expiresAt: Date; fileUrl?: string }
) {
  const context = await getTenantContext()
  
  return await withTenantContext(context, async (tx) => {
    const doc = await tx.driverComplianceDocument.update({
      where: { id },
      data: {
        docType: data.docType,
        issuedAt: data.issuedAt,
        expiresAt: data.expiresAt,
        fileUrl: data.fileUrl
      }
    })
    
    revalidatePath(`/dashboard/drivers/${doc.driverId}/compliance`)
    revalidatePath('/dashboard/compliance')
    revalidatePath('/dashboard')
    revalidatePath('/dashboard/audit-logs')
    
    return doc
  })
}

export async function deleteComplianceDocument(id: string) {
  const context = await getTenantContext()
  
  return await withTenantContext(context, async (tx) => {
    // First get the document to know driverId for revalidation
    // RLS ensures we can only access our tenant's documents
    const doc = await tx.driverComplianceDocument.findUnique({
      where: { id }
    })
    
    if (!doc) {
      throw new Error('Document not found')
    }
    
    // Soft delete using UPDATE, not DELETE
    await tx.driverComplianceDocument.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deletedBy: context.userId
      }
    })
    
    revalidatePath(`/dashboard/drivers/${doc.driverId}/compliance`)
    revalidatePath('/dashboard/compliance')
    revalidatePath('/dashboard')
    revalidatePath('/dashboard/audit-logs')
    
    return doc
  })
}

// ============================================================================
// COMPLIANCE QUERIES - Expired and Expiring Documents
// ============================================================================

export async function getExpiredComplianceDocuments() {
  const context = await getTenantContext()
  
  return await withTenantContext(context, async (tx) => {
    const now = new Date()
    
    return await tx.driverComplianceDocument.findMany({
      where: {
        expiresAt: {
          lt: now
        },
        deletedAt: null
      },
      include: {
        driver: true
      },
      orderBy: { expiresAt: 'asc' }
    })
  })
}

export async function getExpiringComplianceDocuments(days: number = 30) {
  const context = await getTenantContext()
  
  return await withTenantContext(context, async (tx) => {
    const now = new Date()
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + days)
    
    return await tx.driverComplianceDocument.findMany({
      where: {
        expiresAt: {
          gte: now,
          lte: futureDate
        },
        deletedAt: null
      },
      include: {
        driver: true
      },
      orderBy: { expiresAt: 'asc' }
    })
  })
}

// ============================================================================
// AUDIT LOG READ - No manual inserts, RLS restricts access
// ============================================================================

export async function getAuditLogs(filters?: { tableName?: string; action?: string }) {
  const context = await getTenantContext()
  
  return await withTenantContext(context, async (tx) => {
    // RLS automatically filters audit logs by tenant_id
    // No need to add where: { tenantId }
    return await tx.auditLog.findMany({
      where: {
        ...(filters?.tableName && { tableName: filters.tableName }),
        ...(filters?.action && { action: filters.action })
      },
      orderBy: { createdAt: 'desc' },
      take: 100
    })
  })
}

// ============================================================================
// TENANT INFO
// ============================================================================

export async function getCurrentTenant() {
  const context = await getTenantContext()
  
  return await withTenantContext(context, async (tx) => {
    // RLS ensures we can only access our own tenant
    return await tx.tenant.findUnique({
      where: { id: context.tenantId }
    })
  })
}

// ============================================================================
// DRIVER BY ID (for compliance page)
// ============================================================================

export async function getDriverById(driverId: string) {
  const context = await getTenantContext()
  
  return await withTenantContext(context, async (tx) => {
    // RLS ensures we can only access our tenant's drivers
    return await tx.driver.findUnique({
      where: { id: driverId }
    })
  })
}
