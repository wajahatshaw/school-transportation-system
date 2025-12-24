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
    // DATABASE-LEVEL: Using view for true database-enforced tenant isolation
    // The view app.v_students automatically filters by tenant_id using session variable
    const students = await tx.$queryRaw<Array<{
      id: string
      tenant_id: string
      first_name: string
      last_name: string
      grade: string | null
      deleted_at: Date | null
      deleted_by: string | null
      created_at: Date
      updated_at: Date
    }>>`
      SELECT * FROM app.v_students
      ORDER BY created_at DESC
    `
    
    // Map to Prisma model format
    return students.map(s => ({
      id: s.id,
      tenantId: s.tenant_id,
      firstName: s.first_name,
      lastName: s.last_name,
      grade: s.grade,
      deletedAt: s.deleted_at,
      deletedBy: s.deleted_by,
      createdAt: s.created_at,
      updatedAt: s.updated_at
    }))
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
    // WORKAROUND: Explicit tenant check because postgres role has BYPASSRLS
    // First verify the student belongs to this tenant
    const existing = await tx.student.findFirst({
      where: { id, tenantId: context.tenantId }
    })
    if (!existing) {
      throw new Error('Student not found or access denied')
    }
    
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
    // WORKAROUND: Explicit tenant check because postgres role has BYPASSRLS
    const existing = await tx.student.findFirst({
      where: { id, tenantId: context.tenantId, deletedAt: null }
    })
    if (!existing) {
      throw new Error('Student not found or access denied')
    }
    
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
    // DATABASE-LEVEL: Using view for true database-enforced tenant isolation
    const drivers = await tx.$queryRaw<Array<{
      id: string
      tenant_id: string
      first_name: string
      last_name: string
      license_number: string | null
      deleted_at: Date | null
      deleted_by: string | null
      created_at: Date
      updated_at: Date
    }>>`
      SELECT * FROM app.v_drivers
      ORDER BY created_at DESC
    `
    
    return drivers.map(d => ({
      id: d.id,
      tenantId: d.tenant_id,
      firstName: d.first_name,
      lastName: d.last_name,
      licenseNumber: d.license_number,
      deletedAt: d.deleted_at,
      deletedBy: d.deleted_by,
      createdAt: d.created_at,
      updatedAt: d.updated_at
    }))
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
    // WORKAROUND: Explicit tenant check because postgres role has BYPASSRLS
    const existing = await tx.driver.findFirst({
      where: { id, tenantId: context.tenantId }
    })
    if (!existing) {
      throw new Error('Driver not found or access denied')
    }
    
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
    // WORKAROUND: Explicit tenant check because postgres role has BYPASSRLS
    const existing = await tx.driver.findFirst({
      where: { id, tenantId: context.tenantId, deletedAt: null }
    })
    if (!existing) {
      throw new Error('Driver not found or access denied')
    }
    
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
    // DATABASE-LEVEL: Using view for true database-enforced tenant isolation
    const docs = await tx.$queryRaw<Array<{
      id: string
      tenant_id: string
      driver_id: string
      doc_type: string
      issued_at: Date | null
      expires_at: Date
      file_url: string | null
      deleted_at: Date | null
      deleted_by: string | null
      created_at: Date
      updated_at: Date
    }>>`
      SELECT * FROM app.v_driver_compliance_documents
      WHERE driver_id = ${driverId}::uuid
      ORDER BY expires_at ASC
    `
    
    return docs.map(d => ({
      id: d.id,
      tenantId: d.tenant_id,
      driverId: d.driver_id,
      docType: d.doc_type,
      issuedAt: d.issued_at,
      expiresAt: d.expires_at,
      fileUrl: d.file_url,
      deletedAt: d.deleted_at,
      deletedBy: d.deleted_by,
      createdAt: d.created_at,
      updatedAt: d.updated_at
    }))
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
    // WORKAROUND: Explicit tenant check because postgres role has BYPASSRLS
    const existing = await tx.driverComplianceDocument.findFirst({
      where: { id, tenantId: context.tenantId }
    })
    if (!existing) {
      throw new Error('Document not found or access denied')
    }
    
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
    // WORKAROUND: Explicit tenant check because postgres role has BYPASSRLS
    const doc = await tx.driverComplianceDocument.findFirst({
      where: { id, tenantId: context.tenantId, deletedAt: null }
    })
    
    if (!doc) {
      throw new Error('Document not found or access denied')
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
    
    // DATABASE-LEVEL: Using view for true database-enforced tenant isolation
    const docs = await tx.$queryRaw<Array<{
      id: string
      tenant_id: string
      driver_id: string
      doc_type: string
      issued_at: Date | null
      expires_at: Date
      file_url: string | null
      deleted_at: Date | null
      deleted_by: string | null
      created_at: Date
      updated_at: Date
    }>>`
      SELECT * FROM app.v_driver_compliance_documents
      WHERE expires_at < ${now}::timestamptz
      ORDER BY expires_at ASC
    `
    
    // Fetch drivers separately (view doesn't include relations)
    const driverIds = [...new Set(docs.map(d => d.driver_id))]
    const drivers = driverIds.length > 0 ? await tx.driver.findMany({
      where: { id: { in: driverIds }, tenantId: context.tenantId }
    }) : []
    const driverMap = new Map(drivers.map(d => [d.id, d]))
    
    return docs.map(d => ({
      id: d.id,
      tenantId: d.tenant_id,
      driverId: d.driver_id,
      docType: d.doc_type,
      issuedAt: d.issued_at,
      expiresAt: d.expires_at,
      fileUrl: d.file_url,
      deletedAt: d.deleted_at,
      deletedBy: d.deleted_by,
      createdAt: d.created_at,
      updatedAt: d.updated_at,
      driver: driverMap.get(d.driver_id) || null
    }))
  })
}

export async function getExpiringComplianceDocuments(days: number = 30) {
  const context = await getTenantContext()
  
  return await withTenantContext(context, async (tx) => {
    const now = new Date()
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + days)
    
    // DATABASE-LEVEL: Using view for true database-enforced tenant isolation
    const docs = await tx.$queryRaw<Array<{
      id: string
      tenant_id: string
      driver_id: string
      doc_type: string
      issued_at: Date | null
      expires_at: Date
      file_url: string | null
      deleted_at: Date | null
      deleted_by: string | null
      created_at: Date
      updated_at: Date
    }>>`
      SELECT * FROM app.v_driver_compliance_documents
      WHERE expires_at >= ${now}::timestamptz
        AND expires_at <= ${futureDate}::timestamptz
      ORDER BY expires_at ASC
    `
    
    // Fetch drivers separately
    const driverIds = [...new Set(docs.map(d => d.driver_id))]
    const drivers = driverIds.length > 0 ? await tx.driver.findMany({
      where: { id: { in: driverIds }, tenantId: context.tenantId }
    }) : []
    const driverMap = new Map(drivers.map(d => [d.id, d]))
    
    return docs.map(d => ({
      id: d.id,
      tenantId: d.tenant_id,
      driverId: d.driver_id,
      docType: d.doc_type,
      issuedAt: d.issued_at,
      expiresAt: d.expires_at,
      fileUrl: d.file_url,
      deletedAt: d.deleted_at,
      deletedBy: d.deleted_by,
      createdAt: d.created_at,
      updatedAt: d.updated_at,
      driver: driverMap.get(d.driver_id) || null
    }))
  })
}

// ============================================================================
// AUDIT LOG READ - No manual inserts, RLS restricts access
// ============================================================================

export async function getAuditLogs(filters?: { tableName?: string; action?: string }) {
  const context = await getTenantContext()
  
  return await withTenantContext(context, async (tx) => {
    // DATABASE-LEVEL: Using view for true database-enforced tenant isolation
    let query = `SELECT * FROM app.v_audit_logs WHERE 1=1`
    const params: any[] = []
    let paramIndex = 1
    
    if (filters?.tableName) {
      query += ` AND table_name = $${paramIndex}`
      params.push(filters.tableName)
      paramIndex++
    }
    
    if (filters?.action) {
      query += ` AND action = $${paramIndex}`
      params.push(filters.action)
      paramIndex++
    }
    
    query += ` ORDER BY created_at DESC LIMIT 100`
    
    const logs = await tx.$queryRawUnsafe<Array<{
      id: string
      tenant_id: string
      table_name: string
      record_id: string
      action: string
      before: any
      after: any
      user_id: string
      ip: string | null
      created_at: Date
    }>>(query, ...params)
    
    return logs.map(l => ({
      id: l.id,
      tenantId: l.tenant_id,
      tableName: l.table_name,
      recordId: l.record_id,
      action: l.action,
      before: l.before,
      after: l.after,
      userId: l.user_id,
      ip: l.ip,
      createdAt: l.created_at
    }))
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
    // DATABASE-LEVEL: Using view for true database-enforced tenant isolation
    const drivers = await tx.$queryRaw<Array<{
      id: string
      tenant_id: string
      first_name: string
      last_name: string
      license_number: string | null
      deleted_at: Date | null
      deleted_by: string | null
      created_at: Date
      updated_at: Date
    }>>`
      SELECT * FROM app.v_drivers
      WHERE id = ${driverId}::uuid
      LIMIT 1
    `
    
    if (drivers.length === 0) return null
    
    const d = drivers[0]
    return {
      id: d.id,
      tenantId: d.tenant_id,
      firstName: d.first_name,
      lastName: d.last_name,
      licenseNumber: d.license_number,
      deletedAt: d.deleted_at,
      deletedBy: d.deleted_by,
      createdAt: d.created_at,
      updatedAt: d.updated_at
    }
  })
}
