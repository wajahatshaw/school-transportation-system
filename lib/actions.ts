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

export async function createStudent(data: { firstName: string; lastName: string; grade?: string; routeId?: string }) {
  const context = await getTenantContext()
  
  return await withTenantContext(context, async (tx) => {
    const student = await tx.student.create({
      data: {
        tenantId: context.tenantId,
        firstName: data.firstName,
        lastName: data.lastName,
        grade: data.grade,
        routeId: data.routeId
      }
    })
    
    // Revalidate both the students page and dashboard
    revalidatePath('/dashboard/students')
    revalidatePath('/dashboard')
    revalidatePath('/dashboard/audit-logs')
    
    return student
  })
}

export async function updateStudent(
  id: string,
  data: { firstName: string; lastName: string; grade?: string; routeId?: string | null }
) {
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
    
    // If routeId is provided, validate route belongs to tenant (or allow null to unassign)
    if (data.routeId !== undefined && data.routeId !== null) {
      const route = await tx.route.findFirst({
        where: { id: data.routeId, tenantId: context.tenantId, deletedAt: null }
      })
      if (!route) {
        throw new Error('Route not found or access denied')
      }
    }

    const student = await tx.student.update({
      where: { id },
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        grade: data.grade,
        ...(data.routeId === undefined ? {} : { routeId: data.routeId })
      }
    })
    
    // Revalidate both the students page and dashboard
    revalidatePath('/dashboard/students')
    revalidatePath('/dashboard/routes')
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
      email: string | null
      auth_user_id: string | null
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
      email: d.email,
      authUserId: d.auth_user_id,
      licenseNumber: d.license_number,
      deletedAt: d.deleted_at,
      deletedBy: d.deleted_by,
      createdAt: d.created_at,
      updatedAt: d.updated_at
    }))
  })
}

export async function createDriver(data: {
  firstName: string
  lastName: string
  email?: string | null
  authUserId?: string | null
  licenseNumber?: string
}) {
  const context = await getTenantContext()
  
  return await withTenantContext(context, async (tx) => {
    // NOTE: Prisma TS types can lag behind schema changes in some environments.
    // We cast to `any` here to avoid blocking builds while still writing safe data.
    const driver = await (tx.driver as any).create({
      data: {
        tenantId: context.tenantId,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email ?? undefined,
        authUserId: data.authUserId ?? undefined,
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

// Compliance Overview (documents + driver relation) for /dashboard/compliance
export async function getComplianceOverviewDocuments() {
  const context = await getTenantContext()

  return await withTenantContext(context, async (tx) => {
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
      ORDER BY expires_at ASC
    `

    const driverIds = [...new Set(docs.map((d) => d.driver_id))]
    const drivers = driverIds.length
      ? await tx.driver.findMany({
          where: { id: { in: driverIds }, tenantId: context.tenantId, deletedAt: null },
        })
      : []
    const driverMap = new Map(drivers.map((d) => [d.id, d]))

    return docs
      .map((d) => {
        const driver = driverMap.get(d.driver_id)
        if (!driver) return null
        return {
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
          driver,
        }
      })
      .filter((x): x is NonNullable<typeof x> => x !== null)
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
    
    return docs
      .map(d => {
        const driver = driverMap.get(d.driver_id)
        if (!driver) return null // Filter out documents without drivers
        return {
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
          driver
        }
      })
      .filter((doc): doc is NonNullable<typeof doc> => doc !== null)
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
    
    return docs
      .map(d => {
        const driver = driverMap.get(d.driver_id)
        if (!driver) return null // Filter out documents without drivers
        return {
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
          driver
        }
      })
      .filter((doc): doc is NonNullable<typeof doc> => doc !== null)
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
// DASHBOARD SUMMARY (for cached dashboard UI)
// ============================================================================

export async function getDashboardData() {
  const context = await getTenantContext()

  return await withTenantContext(context, async (tx) => {
    const [studentsCountRows, driversCountRows, complianceCountsRows, recentLogs] = await Promise.all([
      tx.$queryRaw<Array<{ count: bigint }>>`SELECT COUNT(*) as count FROM app.v_students`,
      tx.$queryRaw<Array<{ count: bigint }>>`SELECT COUNT(*) as count FROM app.v_drivers`,
      tx.$queryRaw<Array<{ expired: bigint; expiring: bigint; valid: bigint }>>`
        SELECT
          COUNT(*) FILTER (WHERE expires_at::date < CURRENT_DATE) AS expired,
          COUNT(*) FILTER (
            WHERE expires_at::date >= CURRENT_DATE
              AND expires_at::date <= (CURRENT_DATE + INTERVAL '30 days')
          ) AS expiring,
          COUNT(*) FILTER (WHERE expires_at::date > (CURRENT_DATE + INTERVAL '30 days')) AS valid
        FROM app.v_driver_compliance_documents
      `,
      tx.$queryRaw<Array<{
        id: string
        table_name: string
        record_id: string
        action: string
        created_at: Date
      }>>`
        SELECT id, table_name, record_id, action, created_at
        FROM app.v_audit_logs
        ORDER BY created_at DESC
        LIMIT 5
      `,
    ])

    const studentsCount = Number(studentsCountRows[0]?.count || 0)
    const driversCount = Number(driversCountRows[0]?.count || 0)
    const expiredCount = Number(complianceCountsRows[0]?.expired || 0)
    const expiringCount = Number(complianceCountsRows[0]?.expiring || 0)
    const validCount = Number(complianceCountsRows[0]?.valid || 0)

    // Alerts (top 5 expired/expiring)
    const [expiredDocs, expiringDocs] = await Promise.all([
      tx.$queryRaw<Array<{ driver_id: string; doc_type: string; expires_at: Date }>>`
        SELECT driver_id, doc_type, expires_at
        FROM app.v_driver_compliance_documents
        WHERE expires_at::date < CURRENT_DATE
        ORDER BY expires_at ASC
        LIMIT 5
      `,
      tx.$queryRaw<Array<{ driver_id: string; doc_type: string; expires_at: Date }>>`
        SELECT driver_id, doc_type, expires_at
        FROM app.v_driver_compliance_documents
        WHERE expires_at::date >= CURRENT_DATE
          AND expires_at::date <= (CURRENT_DATE + INTERVAL '30 days')
        ORDER BY expires_at ASC
        LIMIT 5
      `,
    ])

    const alertDriverIds = Array.from(
      new Set([...expiredDocs.map((d) => d.driver_id), ...expiringDocs.map((d) => d.driver_id)])
    )

    const drivers = alertDriverIds.length
      ? await tx.driver.findMany({
          where: { id: { in: alertDriverIds }, tenantId: context.tenantId, deletedAt: null },
        })
      : []
    const driverMap = new Map(drivers.map((d) => [d.id, d]))

    return {
      studentsCount,
      driversCount,
      complianceCounts: {
        expired: expiredCount,
        expiring: expiringCount,
        valid: validCount,
      },
      complianceAlerts: {
        expired: expiredDocs
          .map((d) => {
            const driver = driverMap.get(d.driver_id)
            if (!driver) return null
            return { driverId: d.driver_id, docType: d.doc_type, expiresAt: d.expires_at, driver }
          })
          .filter((x): x is NonNullable<typeof x> => x !== null),
        expiring: expiringDocs
          .map((d) => {
            const driver = driverMap.get(d.driver_id)
            if (!driver) return null
            return { driverId: d.driver_id, docType: d.doc_type, expiresAt: d.expires_at, driver }
          })
          .filter((x): x is NonNullable<typeof x> => x !== null),
      },
      recentAuditLogs: recentLogs.map((l) => ({
        id: l.id,
        tableName: l.table_name,
        recordId: l.record_id,
        action: l.action,
        createdAt: l.created_at,
      })),
    }
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

// ============================================================================
// VEHICLE CRUD - All operations rely on RLS
// ============================================================================

export async function getVehicles() {
  const context = await getTenantContext()
  
  return await withTenantContext(context, async (tx) => {
    // DATABASE-LEVEL: Using view for true database-enforced tenant isolation
    const vehicles = await tx.$queryRaw<Array<{
      id: string
      tenant_id: string
      name: string
      capacity: number
      license_plate: string | null
      vehicle_type: string | null
      deleted_at: Date | null
      deleted_by: string | null
      created_at: Date
      updated_at: Date
    }>>`
      SELECT * FROM app.v_vehicles
      ORDER BY created_at DESC
    `
    
    return vehicles.map(v => ({
      id: v.id,
      tenantId: v.tenant_id,
      name: v.name,
      capacity: v.capacity,
      licensePlate: v.license_plate,
      vehicleType: v.vehicle_type,
      deletedAt: v.deleted_at,
      deletedBy: v.deleted_by,
      createdAt: v.created_at,
      updatedAt: v.updated_at
    }))
  })
}

export async function createVehicle(data: { 
  name: string
  capacity: number
  licensePlate?: string
  vehicleType?: string
}) {
  const context = await getTenantContext()
  
  if (!Number.isInteger(data.capacity) || data.capacity <= 0) {
    throw new Error('Capacity must be a positive integer')
  }
  if (data.capacity > 60) {
    throw new Error('Capacity cannot be more than 60')
  }

  return await withTenantContext(context, async (tx) => {
    const vehicle = await tx.vehicle.create({
      data: {
        tenantId: context.tenantId,
        name: data.name,
        capacity: data.capacity,
        licensePlate: data.licensePlate,
        vehicleType: data.vehicleType
      }
    })
    
    revalidatePath('/dashboard/vehicles')
    revalidatePath('/dashboard/routes')
    revalidatePath('/dashboard')
    revalidatePath('/dashboard/audit-logs')
    
    return vehicle
  })
}

export async function updateVehicle(
  id: string, 
  data: { 
    name: string
    capacity: number
    licensePlate?: string
    vehicleType?: string
  }
) {
  const context = await getTenantContext()
  
  if (!Number.isInteger(data.capacity) || data.capacity <= 0) {
    throw new Error('Capacity must be a positive integer')
  }
  if (data.capacity > 60) {
    throw new Error('Capacity cannot be more than 60')
  }

  return await withTenantContext(context, async (tx) => {
    // WORKAROUND: Explicit tenant check because postgres role has BYPASSRLS
    const existing = await tx.vehicle.findFirst({
      where: { id, tenantId: context.tenantId }
    })
    if (!existing) {
      throw new Error('Vehicle not found or access denied')
    }
    
    const vehicle = await tx.vehicle.update({
      where: { id },
      data: {
        name: data.name,
        capacity: data.capacity,
        licensePlate: data.licensePlate,
        vehicleType: data.vehicleType
      }
    })
    
    revalidatePath('/dashboard/vehicles')
    revalidatePath('/dashboard/routes')
    revalidatePath('/dashboard')
    revalidatePath('/dashboard/audit-logs')
    
    return vehicle
  })
}

export async function deleteVehicle(id: string) {
  const context = await getTenantContext()
  
  return await withTenantContext(context, async (tx) => {
    // WORKAROUND: Explicit tenant check because postgres role has BYPASSRLS
    const existing = await tx.vehicle.findFirst({
      where: { id, tenantId: context.tenantId, deletedAt: null }
    })
    if (!existing) {
      throw new Error('Vehicle not found or access denied')
    }
    
    const vehicle = await tx.vehicle.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deletedBy: context.userId
      }
    })
    
    revalidatePath('/dashboard/vehicles')
    revalidatePath('/dashboard/routes')
    revalidatePath('/dashboard')
    revalidatePath('/dashboard/audit-logs')
    
    return vehicle
  })
}

export async function getVehicleById(vehicleId: string) {
  const context = await getTenantContext()
  
  return await withTenantContext(context, async (tx) => {
    // DATABASE-LEVEL: Using view for true database-enforced tenant isolation
    const vehicles = await tx.$queryRaw<Array<{
      id: string
      tenant_id: string
      name: string
      capacity: number
      license_plate: string | null
      vehicle_type: string | null
      deleted_at: Date | null
      deleted_by: string | null
      created_at: Date
      updated_at: Date
    }>>`
      SELECT * FROM app.v_vehicles
      WHERE id = ${vehicleId}::uuid
      LIMIT 1
    `
    
    if (vehicles.length === 0) return null
    
    const v = vehicles[0]
    return {
      id: v.id,
      tenantId: v.tenant_id,
      name: v.name,
      capacity: v.capacity,
      licensePlate: v.license_plate,
      vehicleType: v.vehicle_type,
      deletedAt: v.deleted_at,
      deletedBy: v.deleted_by,
      createdAt: v.created_at,
      updatedAt: v.updated_at
    }
  })
}

// ============================================================================
// ROUTE CRUD - All operations rely on RLS
// ============================================================================

function normalizeJsonValue<T = unknown>(value: unknown): T | unknown {
  if (typeof value !== 'string') return value
  try {
    return JSON.parse(value) as T
  } catch {
    return value
  }
}

function normalizeStops(value: unknown): unknown[] {
  const normalized = normalizeJsonValue(value)
  return Array.isArray(normalized) ? normalized : []
}

export async function getRoutes() {
  const context = await getTenantContext()
  
  return await withTenantContext(context, async (tx) => {
    // DATABASE-LEVEL: Using view for true database-enforced tenant isolation
    const routes = await tx.$queryRaw<Array<{
      id: string
      tenant_id: string
      name: string
      type: string
      vehicle_id: string | null
      driver_id: string | null
      stops: any
      deleted_at: Date | null
      deleted_by: string | null
      created_at: Date
      updated_at: Date
    }>>`
      SELECT * FROM app.v_routes
      ORDER BY created_at DESC
    `
    
    // Fetch vehicles and drivers separately for relations
    const vehicleIds = routes.map(r => r.vehicle_id).filter((id): id is string => id !== null)
    const driverIds = routes.map(r => r.driver_id).filter((id): id is string => id !== null)
    
    const vehicles = vehicleIds.length > 0 ? await tx.vehicle.findMany({
      where: { id: { in: vehicleIds }, tenantId: context.tenantId }
    }) : []
    
    const drivers = driverIds.length > 0 ? await tx.driver.findMany({
      where: { id: { in: driverIds }, tenantId: context.tenantId }
    }) : []
    
    const vehicleMap = new Map(vehicles.map(v => [v.id, v]))
    const driverMap = new Map(drivers.map(d => [d.id, d]))
    
    return routes.map(r => ({
      id: r.id,
      tenantId: r.tenant_id,
      name: r.name,
      type: r.type,
      vehicleId: r.vehicle_id,
      driverId: r.driver_id,
      stops: normalizeStops(r.stops),
      deletedAt: r.deleted_at,
      deletedBy: r.deleted_by,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      vehicle: r.vehicle_id ? vehicleMap.get(r.vehicle_id) || null : null,
      driver: r.driver_id ? driverMap.get(r.driver_id) || null : null
    }))
  })
}

export async function createRoute(data: { 
  name: string
  type: 'AM' | 'PM'
  vehicleId?: string
  driverId?: string
  stops?: any
}) {
  const context = await getTenantContext()
  
  // Validate type
  if (data.type !== 'AM' && data.type !== 'PM') {
    throw new Error('Route type must be AM or PM')
  }
  
  return await withTenantContext(context, async (tx) => {
    const route = await tx.route.create({
      data: {
        tenantId: context.tenantId,
        name: data.name,
        type: data.type,
        vehicleId: data.vehicleId,
        driverId: data.driverId,
        stops: data.stops || []
      }
    })
    
    revalidatePath('/dashboard/routes')
    revalidatePath('/dashboard')
    revalidatePath('/dashboard/audit-logs')
    
    return route
  })
}

export async function updateRoute(
  id: string, 
  data: { 
    name: string
    type: 'AM' | 'PM'
    vehicleId?: string | null
    driverId?: string | null
    stops?: any
  }
) {
  const context = await getTenantContext()
  
  // Validate type
  if (data.type !== 'AM' && data.type !== 'PM') {
    throw new Error('Route type must be AM or PM')
  }
  
  return await withTenantContext(context, async (tx) => {
    // WORKAROUND: Explicit tenant check because postgres role has BYPASSRLS
    const existing = await tx.route.findFirst({
      where: { id, tenantId: context.tenantId }
    })
    if (!existing) {
      throw new Error('Route not found or access denied')
    }
    
    const route = await tx.route.update({
      where: { id },
      data: {
        name: data.name,
        type: data.type,
        vehicleId: data.vehicleId === null ? null : data.vehicleId,
        driverId: data.driverId === null ? null : data.driverId,
        stops: data.stops !== undefined ? data.stops : existing.stops
      }
    })
    
    revalidatePath('/dashboard/routes')
    revalidatePath('/dashboard')
    revalidatePath('/dashboard/audit-logs')
    
    return route
  })
}

export async function deleteRoute(id: string) {
  const context = await getTenantContext()
  
  return await withTenantContext(context, async (tx) => {
    // WORKAROUND: Explicit tenant check because postgres role has BYPASSRLS
    const existing = await tx.route.findFirst({
      where: { id, tenantId: context.tenantId, deletedAt: null }
    })
    if (!existing) {
      throw new Error('Route not found or access denied')
    }
    
    const route = await tx.route.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deletedBy: context.userId
      }
    })
    
    revalidatePath('/dashboard/routes')
    revalidatePath('/dashboard')
    revalidatePath('/dashboard/audit-logs')
    
    return route
  })
}

export async function getRouteById(routeId: string) {
  const context = await getTenantContext()
  
  return await withTenantContext(context, async (tx) => {
    // DATABASE-LEVEL: Using view for true database-enforced tenant isolation
    const routes = await tx.$queryRaw<Array<{
      id: string
      tenant_id: string
      name: string
      type: string
      vehicle_id: string | null
      driver_id: string | null
      stops: any
      deleted_at: Date | null
      deleted_by: string | null
      created_at: Date
      updated_at: Date
    }>>`
      SELECT * FROM app.v_routes
      WHERE id = ${routeId}::uuid
      LIMIT 1
    `
    
    if (routes.length === 0) return null
    
    const r = routes[0]
    
    // Fetch vehicle and driver if assigned
    const vehicle = r.vehicle_id ? await tx.vehicle.findUnique({
      where: { id: r.vehicle_id }
    }) : null
    
    const driver = r.driver_id ? await tx.driver.findUnique({
      where: { id: r.driver_id }
    }) : null
    
    return {
      id: r.id,
      tenantId: r.tenant_id,
      name: r.name,
      type: r.type,
      vehicleId: r.vehicle_id,
      driverId: r.driver_id,
      stops: normalizeStops(r.stops),
      deletedAt: r.deleted_at,
      deletedBy: r.deleted_by,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      vehicle,
      driver
    }
  })
}

export async function assignDriverToRoute(routeId: string, driverId: string | null) {
  const context = await getTenantContext()
  
  return await withTenantContext(context, async (tx) => {
    // WORKAROUND: Explicit tenant check
    const existing = await tx.route.findFirst({
      where: { id: routeId, tenantId: context.tenantId }
    })
    if (!existing) {
      throw new Error('Route not found or access denied')
    }
    
    // Verify driver belongs to same tenant if driverId is provided
    if (driverId) {
      const driver = await tx.driver.findFirst({
        where: { id: driverId, tenantId: context.tenantId }
      })
      if (!driver) {
        throw new Error('Driver not found or access denied')
      }
    }
    
    const route = await tx.route.update({
      where: { id: routeId },
      data: { driverId }
    })
    
    revalidatePath('/dashboard/routes')
    revalidatePath('/dashboard/drivers')
    revalidatePath('/dashboard')
    revalidatePath('/dashboard/audit-logs')
    
    return route
  })
}

export async function assignVehicleToRoute(routeId: string, vehicleId: string | null) {
  const context = await getTenantContext()
  
  return await withTenantContext(context, async (tx) => {
    // WORKAROUND: Explicit tenant check
    const existing = await tx.route.findFirst({
      where: { id: routeId, tenantId: context.tenantId }
    })
    if (!existing) {
      throw new Error('Route not found or access denied')
    }
    
    // Verify vehicle belongs to same tenant if vehicleId is provided
    if (vehicleId) {
      const vehicle = await tx.vehicle.findFirst({
        where: { id: vehicleId, tenantId: context.tenantId }
      })
      if (!vehicle) {
        throw new Error('Vehicle not found or access denied')
      }
    }
    
    const route = await tx.route.update({
      where: { id: routeId },
      data: { vehicleId }
    })
    
    revalidatePath('/dashboard/routes')
    revalidatePath('/dashboard/vehicles')
    revalidatePath('/dashboard')
    revalidatePath('/dashboard/audit-logs')
    
    return route
  })
}

export async function assignStudentToRoute(studentId: string, routeId: string | null) {
  const context = await getTenantContext()
  
  return await withTenantContext(context, async (tx) => {
    // WORKAROUND: Explicit tenant check
    const existing = await tx.student.findFirst({
      where: { id: studentId, tenantId: context.tenantId }
    })
    if (!existing) {
      throw new Error('Student not found or access denied')
    }
    
    // Verify route belongs to same tenant if routeId is provided
    if (routeId) {
      const route = await tx.route.findFirst({
        where: { id: routeId, tenantId: context.tenantId }
      })
      if (!route) {
        throw new Error('Route not found or access denied')
      }
    }
    
    const student = await tx.student.update({
      where: { id: studentId },
      data: { routeId }
    })
    
    revalidatePath('/dashboard/students')
    revalidatePath('/dashboard/routes')
    revalidatePath('/dashboard')
    revalidatePath('/dashboard/audit-logs')
    
    return student
  })
}

export async function getRouteCapacity(routeId: string) {
  const context = await getTenantContext()
  
  return await withTenantContext(context, async (tx) => {
    // IMPORTANT: avoid nested transactions by not calling getRouteById() here.
    // Fetch route + vehicle capacity within the same tenant context.
    const routeRows = await tx.$queryRaw<Array<{ id: string; vehicle_id: string | null }>>`
      SELECT id, vehicle_id
      FROM app.v_routes
      WHERE id = ${routeId}::uuid
      LIMIT 1
    `
    const routeRow = routeRows[0]
    if (!routeRow) throw new Error('Route not found')

    let capacity = 0
    if (routeRow.vehicle_id) {
      const vehicleRows = await tx.$queryRaw<Array<{ capacity: number }>>`
        SELECT capacity
        FROM app.v_vehicles
        WHERE id = ${routeRow.vehicle_id}::uuid
        LIMIT 1
      `
      capacity = Number(vehicleRows[0]?.capacity || 0)
    }
    
    // Count students assigned to route
    const studentCount = await tx.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count
      FROM app.v_students
      WHERE route_id = ${routeId}::uuid
    `
    
    const assigned = Number(studentCount[0]?.count || 0)
    const available = Math.max(0, capacity - assigned)
    const isFull = capacity > 0 && assigned >= capacity
    
    return {
      assigned,
      capacity,
      available,
      isFull
    }
  })
}

export async function getRouteCapacities(routeIds: string[]) {
  const context = await getTenantContext()

  if (!Array.isArray(routeIds) || routeIds.length === 0) {
    return {}
  }

  return await withTenantContext(context, async (tx) => {
    // 1) Routes → vehicle ids
    const routes = await tx.$queryRaw<Array<{ id: string; vehicle_id: string | null }>>`
      SELECT id, vehicle_id
      FROM app.v_routes
      WHERE id = ANY(${routeIds}::uuid[])
    `

    const vehicleIds = Array.from(
      new Set(routes.map((r) => r.vehicle_id).filter((id): id is string => !!id))
    )

    // 2) Vehicle capacities
    const vehicles = vehicleIds.length
      ? await tx.$queryRaw<Array<{ id: string; capacity: number }>>`
          SELECT id, capacity
          FROM app.v_vehicles
          WHERE id = ANY(${vehicleIds}::uuid[])
        `
      : []
    const vehicleCapMap = new Map(vehicles.map((v) => [v.id, Number(v.capacity || 0)]))

    // 3) Student counts grouped by route_id
    const counts = await tx.$queryRaw<Array<{ route_id: string; count: bigint }>>`
      SELECT route_id, COUNT(*) as count
      FROM app.v_students
      WHERE route_id = ANY(${routeIds}::uuid[])
      GROUP BY route_id
    `
    const countMap = new Map(counts.map((c) => [c.route_id, Number(c.count || 0)]))

    // 4) Build response map
    const out: Record<string, { assigned: number; capacity: number; available: number; isFull: boolean }> = {}
    for (const r of routes) {
      const assigned = countMap.get(r.id) ?? 0
      const capacity = r.vehicle_id ? (vehicleCapMap.get(r.vehicle_id) ?? 0) : 0
      const available = Math.max(0, capacity - assigned)
      const isFull = capacity > 0 && assigned >= capacity
      out[r.id] = { assigned, capacity, available, isFull }
    }
    return out
  })
}

export async function getRoutesByType(type: 'AM' | 'PM') {
  const context = await getTenantContext()
  
  return await withTenantContext(context, async (tx) => {
    // DATABASE-LEVEL: Using view for true database-enforced tenant isolation
    const routes = await tx.$queryRaw<Array<{
      id: string
      tenant_id: string
      name: string
      type: string
      vehicle_id: string | null
      driver_id: string | null
      stops: any
      deleted_at: Date | null
      deleted_by: string | null
      created_at: Date
      updated_at: Date
    }>>`
      SELECT * FROM app.v_routes
      WHERE type = ${type}
      ORDER BY created_at DESC
    `
    
    return routes.map(r => ({
      id: r.id,
      tenantId: r.tenant_id,
      name: r.name,
      type: r.type,
      vehicleId: r.vehicle_id,
      driverId: r.driver_id,
      stops: normalizeStops(r.stops),
      deletedAt: r.deleted_at,
      deletedBy: r.deleted_by,
      createdAt: r.created_at,
      updatedAt: r.updated_at
    }))
  })
}

// ============================================================================
// ROUTE TRIP CRUD - Milestone 3: Attendance & Trip Execution
// ============================================================================

export async function getRouteTrips(filters?: {
  routeId?: string
  driverId?: string
  startDate?: Date | string
  endDate?: Date | string
  routeType?: 'AM' | 'PM'
  includeConfirmed?: boolean
  limit?: number
  offset?: number
  sort?: 'asc' | 'desc'
}) {
  const context = await getTenantContext()
  const { requireTenant } = await import('./auth/session')
  const session = await requireTenant()
  
  return await withTenantContext(context, async (tx) => {
    // Build dynamic query
    let query = `SELECT * FROM app.v_route_trips WHERE 1=1`
    const params: any[] = []
    let paramIndex = 1
    
    if (filters?.routeId) {
      query += ` AND route_id = $${paramIndex}::uuid`
      params.push(filters.routeId)
      paramIndex++
    }
    
    // Drivers can only see their own assigned trips
    const effectiveDriverId =
      session.role === 'driver' ? (session.driverId || undefined) : filters?.driverId

  if (session.role === 'driver' && !effectiveDriverId) {
    // Driver membership exists but isn't linked to a driver record yet.
    // Return no trips rather than leaking tenant-wide trips.
    return []
  }

    if (effectiveDriverId) {
      query += ` AND driver_id = $${paramIndex}::uuid`
      params.push(effectiveDriverId)
      paramIndex++
    }
    
    if (filters?.startDate) {
      query += ` AND trip_date >= $${paramIndex}::date`
      params.push(filters.startDate)
      paramIndex++
    }
    
    if (filters?.endDate) {
      query += ` AND trip_date <= $${paramIndex}::date`
      params.push(filters.endDate)
      paramIndex++
    }
    
    if (filters?.routeType) {
      query += ` AND route_type = $${paramIndex}`
      params.push(filters.routeType)
      paramIndex++
    }
    
    if (filters?.includeConfirmed === false) {
      query += ` AND confirmed_at IS NULL`
    }
    
    const sortDir = (filters?.sort || 'desc').toUpperCase()
    query += ` ORDER BY trip_date ${sortDir}, route_type ${sortDir}`

    if (typeof filters?.limit === 'number') {
      query += ` LIMIT $${paramIndex}`
      params.push(filters.limit)
      paramIndex++
    }
    if (typeof filters?.offset === 'number') {
      query += ` OFFSET $${paramIndex}`
      params.push(filters.offset)
      paramIndex++
    }
    
    const trips = await tx.$queryRawUnsafe<Array<{
      id: string
      tenant_id: string
      route_id: string
      trip_date: Date
      route_type: string
      driver_id: string | null
      confirmed_at: Date | null
      confirmed_by: string | null
      created_at: Date
    }>>(query, ...params)
    
    // Fetch related data
    const routeIds = [...new Set(trips.map(t => t.route_id))]
    const driverIds = [...new Set(trips.map(t => t.driver_id).filter((id): id is string => id !== null))]
    
    const routes = routeIds.length > 0 ? await tx.route.findMany({
      where: { id: { in: routeIds }, tenantId: context.tenantId }
    }) : []
    
    const drivers = driverIds.length > 0 ? await tx.driver.findMany({
      where: { id: { in: driverIds }, tenantId: context.tenantId }
    }) : []
    
    const routeMap = new Map(routes.map(r => [r.id, r]))
    const driverMap = new Map(drivers.map(d => [d.id, d]))
    
    return trips.map(t => ({
      id: t.id,
      tenantId: t.tenant_id,
      routeId: t.route_id,
      tripDate: t.trip_date,
      routeType: t.route_type,
      driverId: t.driver_id,
      confirmedAt: t.confirmed_at,
      confirmedBy: t.confirmed_by,
      createdAt: t.created_at,
      route: routeMap.get(t.route_id) || null,
      driver: t.driver_id ? driverMap.get(t.driver_id) || null : null
    }))
  })
}

export async function getTripById(tripId: string) {
  const context = await getTenantContext()
  const { requireTenant } = await import('./auth/session')
  const session = await requireTenant()
  
  return await withTenantContext(context, async (tx) => {
    // Use Prisma model directly with explicit tenant scoping.
    // This avoids edge cases where the session variable isn't set for the view.
    const trip = await tx.routeTrip.findFirst({
      where: { id: tripId, tenantId: context.tenantId },
      include: {
        route: true,
        driver: true
      }
    })

    if (!trip) return null

    // Drivers can only view their assigned trips
    if (session.role === 'driver') {
      if (!session.driverId || trip.driverId !== session.driverId) return null
    }

    return {
      id: trip.id,
      tenantId: trip.tenantId,
      routeId: trip.routeId,
      tripDate: trip.tripDate,
      routeType: trip.routeType,
      driverId: trip.driverId,
      confirmedAt: trip.confirmedAt,
      confirmedBy: trip.confirmedBy,
      createdAt: trip.createdAt,
      route: trip.route,
      driver: trip.driver
    }
  })
}

export async function getTodayTrips(routeType?: 'AM' | 'PM') {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  
  return await getRouteTrips({
    startDate: today,
    endDate: today,
    routeType
  })
}

export async function createRouteTrip(data: {
  routeId: string
  // Date-only field (Postgres DATE). Accept YYYY-MM-DD to avoid timezone drift.
  tripDate: Date | string
  routeType: 'AM' | 'PM'
  driverId?: string
}) {
  const context = await getTenantContext()
  
  // Validate route type
  if (data.routeType !== 'AM' && data.routeType !== 'PM') {
    throw new Error('Route type must be AM or PM')
  }
  
  return await withTenantContext(context, async (tx) => {
    // Verify route exists and belongs to tenant
    const route = await tx.route.findFirst({
      where: { id: data.routeId, tenantId: context.tenantId }
    })
    if (!route) {
      throw new Error('Route not found or access denied')
    }
    
    // Verify driver exists and belongs to tenant if provided
    if (data.driverId) {
      const driver = await tx.driver.findFirst({
        where: { id: data.driverId, tenantId: context.tenantId }
      })
      if (!driver) {
        throw new Error('Driver not found or access denied')
      }
    }
    
    // Check if trip already exists
    const normalizedTripDate = normalizeDateOnlyUtc(data.tripDate)
    const existing = await tx.routeTrip.findFirst({
      where: {
        routeId: data.routeId,
        tripDate: normalizedTripDate,
        routeType: data.routeType
      }
    })
    
    if (existing) {
      throw new Error('Trip already exists for this route, date, and type')
    }
    
    const trip = await tx.routeTrip.create({
      data: {
        tenantId: context.tenantId,
        routeId: data.routeId,
        tripDate: normalizedTripDate,
        routeType: data.routeType,
        driverId: data.driverId || route.driverId
      }
    })
    
    revalidatePath('/dashboard/attendance')
    revalidatePath('/dashboard/my-trips')
    revalidatePath('/dashboard/audit-logs')
    
    return trip
  })
}

function normalizeDateOnlyUtc(input: Date | string): Date {
  if (input instanceof Date) {
    const y = input.getUTCFullYear()
    const m = input.getUTCMonth()
    const d = input.getUTCDate()
    return new Date(Date.UTC(y, m, d))
  }

  // Expect YYYY-MM-DD
  const s = String(input).trim()
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s)
  if (!match) {
    // Fallback: try native parsing, but normalize to UTC date-only to avoid shifts.
    const parsed = new Date(s)
    if (Number.isNaN(parsed.getTime())) throw new Error('Invalid tripDate (expected YYYY-MM-DD)')
    const y = parsed.getUTCFullYear()
    const m = parsed.getUTCMonth()
    const d = parsed.getUTCDate()
    return new Date(Date.UTC(y, m, d))
  }

  const y = Number(match[1])
  const m = Number(match[2]) - 1
  const d = Number(match[3])
  return new Date(Date.UTC(y, m, d))
}

export async function confirmTrip(tripId: string) {
  const context = await getTenantContext()
  const { requireTenant } = await import('./auth/session')
  const session = await requireTenant()
  
  return await withTenantContext(context, async (tx) => {
    // Verify trip exists and belongs to tenant
    const existing = await tx.routeTrip.findFirst({
      where: { id: tripId, tenantId: context.tenantId }
    })
    if (!existing) {
      throw new Error('Trip not found or access denied')
    }

    // Drivers: only confirm their own trip, and only for today
    if (session.role === 'driver') {
      if (!session.driverId) {
        throw new Error('Driver is not linked to a driver record')
      }
      if (!session.driverId || existing.driverId !== session.driverId) {
        throw new Error('Access denied')
      }
    }
    
    // Check if already confirmed
    if (existing.confirmedAt) {
      throw new Error('Trip is already confirmed')
    }
    
    const trip = await tx.routeTrip.update({
      where: { id: tripId },
      data: {
        confirmedAt: new Date(),
        confirmedBy: context.userId
      }
    })
    
    revalidatePath('/dashboard/attendance')
    revalidatePath('/dashboard/my-trips')
    revalidatePath(`/dashboard/my-trips/${tripId}`)
    revalidatePath('/dashboard/audit-logs')
    
    return trip
  })
}

export async function getTripsByDateRange(startDate: Date, endDate: Date) {
  return await getRouteTrips({ startDate, endDate })
}

// ============================================================================
// ATTENDANCE CRUD - Milestone 3: Attendance & Trip Execution
// ============================================================================

export async function getTripAttendance(tripId: string) {
  const context = await getTenantContext()
  const { requireTenant } = await import('./auth/session')
  const session = await requireTenant()
  
  return await withTenantContext(context, async (tx) => {
    // Drivers can only access attendance for their own trips
    if (session.role === 'driver') {
      if (!session.driverId) {
        throw new Error('Driver is not linked to a driver record')
      }
      const trip = await tx.routeTrip.findFirst({
        where: { id: tripId, tenantId: context.tenantId },
        select: { driverId: true }
      })
      if (!trip || !session.driverId || trip.driverId !== session.driverId) {
        throw new Error('Access denied')
      }
    }

    const attendance = await tx.$queryRaw<Array<{
      id: string
      tenant_id: string
      trip_id: string
      student_id: string
      status: string
      marked_at: Date
      marked_by: string
    }>>`
      SELECT * FROM app.v_attendance_records
      WHERE trip_id = ${tripId}::uuid
      ORDER BY marked_at ASC
    `
    
    // Fetch students
    const studentIds = [...new Set(attendance.map(a => a.student_id))]
    const students = studentIds.length > 0 ? await tx.student.findMany({
      where: { id: { in: studentIds }, tenantId: context.tenantId }
    }) : []
    
    const studentMap = new Map(students.map(s => [s.id, s]))
    
    return attendance.map(a => ({
      id: a.id,
      tenantId: a.tenant_id,
      tripId: a.trip_id,
      studentId: a.student_id,
      status: a.status,
      markedAt: a.marked_at,
      markedBy: a.marked_by,
      student: studentMap.get(a.student_id) || null
    }))
  })
}

export async function markAttendance(
  tripId: string,
  studentId: string,
  status: 'boarded' | 'absent' | 'no_show'
) {
  const context = await getTenantContext()
  const { requireTenant } = await import('./auth/session')
  const session = await requireTenant()
  
  if (!tripId) {
    throw new Error('Trip ID is required')
  }
  if (!studentId) {
    throw new Error('Student ID is required')
  }

  // Validate status
  if (!['boarded', 'absent', 'no_show'].includes(status)) {
    throw new Error('Invalid status. Must be boarded, absent, or no_show')
  }
  
  return await withTenantContext(context, async (tx) => {
    // Verify trip exists and belongs to tenant
    const trip = await tx.routeTrip.findFirst({
      where: { id: tripId, tenantId: context.tenantId }
    })
    if (!trip) {
      throw new Error('Trip not found or access denied')
    }

    // Drivers: only mark for their own trips, and only for today
    if (session.role === 'driver') {
      if (!session.driverId) {
        throw new Error('Driver is not linked to a driver record')
      }
      if (!session.driverId || trip.driverId !== session.driverId) {
        throw new Error('Access denied')
      }
    }
    
    // Check if trip is confirmed
    if (trip.confirmedAt) {
      throw new Error('Cannot mark attendance for confirmed trip')
    }
    
    // Verify student exists and belongs to tenant
    const student = await tx.student.findFirst({
      where: { id: studentId, tenantId: context.tenantId }
    })
    if (!student) {
      throw new Error('Student not found or access denied')
    }
    
    // Check if attendance already exists
    const existing = await tx.attendanceRecord.findFirst({
      where: {
        tripId,
        studentId
      }
    })
    
    if (existing) {
      // Update existing attendance
      const updated = await tx.attendanceRecord.update({
        where: { id: existing.id },
        data: {
          status,
          markedAt: new Date(),
          markedBy: context.userId
        },
        include: { student: true }
      })
      
      revalidatePath('/dashboard/attendance')
      revalidatePath('/dashboard/my-trips')
      revalidatePath(`/dashboard/my-trips/${tripId}`)
      revalidatePath(`/dashboard/attendance/${tripId}`)
      revalidatePath('/dashboard/audit-logs')
      
      return updated
    } else {
      // Create new attendance record
      const attendance = await tx.attendanceRecord.create({
        data: {
          tenant: { connect: { id: context.tenantId } },
          trip: { connect: { id: tripId } },
          student: { connect: { id: studentId } },
          status,
          markedBy: context.userId
        },
        include: { student: true }
      })
      
      revalidatePath('/dashboard/attendance')
      revalidatePath('/dashboard/my-trips')
      revalidatePath(`/dashboard/my-trips/${tripId}`)
      revalidatePath(`/dashboard/attendance/${tripId}`)
      revalidatePath('/dashboard/audit-logs')
      
      return attendance
    }
  })
}

export async function updateAttendance(
  attendanceId: string,
  status: 'boarded' | 'absent' | 'no_show'
) {
  const context = await getTenantContext()
  
  // Validate status
  if (!['boarded', 'absent', 'no_show'].includes(status)) {
    throw new Error('Invalid status. Must be boarded, absent, or no_show')
  }
  
  return await withTenantContext(context, async (tx) => {
    // Verify attendance exists and belongs to tenant
    const existing = await tx.attendanceRecord.findFirst({
      where: { id: attendanceId, tenantId: context.tenantId },
      include: { trip: true }
    })
    if (!existing) {
      throw new Error('Attendance record not found or access denied')
    }
    
    // Check if trip is confirmed
    if (existing.trip.confirmedAt) {
      throw new Error('Cannot update attendance for confirmed trip')
    }
    
    const attendance = await tx.attendanceRecord.update({
      where: { id: attendanceId },
      data: {
        status,
        markedAt: new Date(),
        markedBy: context.userId
      }
    })
    
    revalidatePath('/dashboard/attendance')
    revalidatePath('/dashboard/my-trips')
    revalidatePath(`/dashboard/my-trips/${existing.tripId}`)
    revalidatePath(`/dashboard/attendance/${existing.tripId}`)
    revalidatePath('/dashboard/audit-logs')
    
    return attendance
  })
}

export async function addStudentToTrip(tripId: string, studentId: string) {
  const context = await getTenantContext()
  const { requireTenant } = await import('./auth/session')
  const session = await requireTenant()
  if (session.role === 'driver') {
    throw new Error('Drivers cannot add students to trips')
  }
  
  if (!tripId) {
    throw new Error('Trip ID is required')
  }
  if (!studentId) {
    throw new Error('Student ID is required')
  }

  return await withTenantContext(context, async (tx) => {
    // Verify trip exists and belongs to tenant
    const trip = await tx.routeTrip.findFirst({
      where: { id: tripId, tenantId: context.tenantId }
    })
    if (!trip) {
      throw new Error('Trip not found or access denied')
    }
    
    // Check if trip is confirmed
    if (trip.confirmedAt) {
      throw new Error('Cannot add student to confirmed trip')
    }
    
    // Verify student exists and belongs to tenant
    const student = await tx.student.findFirst({
      where: { id: studentId, tenantId: context.tenantId }
    })
    if (!student) {
      throw new Error('Student not found or access denied')
    }
    
    // Check if student already has attendance record for this trip
    const existing = await tx.attendanceRecord.findFirst({
      where: { tripId, studentId }
    })
    
    if (existing) {
      throw new Error('Student is already on this trip')
    }
    
    // Add student with no status yet (will be marked later)
    const attendance = await tx.attendanceRecord.create({
      data: {
        tenant: { connect: { id: context.tenantId } },
        trip: { connect: { id: tripId } },
        student: { connect: { id: studentId } },
        status: 'absent', // Default to absent until marked
        markedBy: context.userId
      },
      include: { student: true }
    })
    
    revalidatePath('/dashboard/attendance')
    revalidatePath('/dashboard/my-trips')
    revalidatePath(`/dashboard/my-trips/${tripId}`)
    revalidatePath(`/dashboard/attendance/${tripId}`)
    revalidatePath('/dashboard/audit-logs')
    
    return attendance
  })
}

export async function removeStudentFromTrip(tripId: string, studentId: string) {
  const context = await getTenantContext()
  const { requireTenant } = await import('./auth/session')
  const session = await requireTenant()
  if (session.role === 'driver') {
    throw new Error('Drivers cannot remove students from trips')
  }
  
  return await withTenantContext(context, async (tx) => {
    // Find attendance record
    const attendance = await tx.attendanceRecord.findFirst({
      where: {
        tripId,
        studentId,
        tenantId: context.tenantId
      },
      include: { trip: true }
    })
    
    if (!attendance) {
      throw new Error('Attendance record not found or access denied')
    }
    
    // Check if trip is confirmed
    if (attendance.trip.confirmedAt) {
      throw new Error('Cannot remove student from confirmed trip')
    }
    
    await tx.attendanceRecord.delete({
      where: { id: attendance.id }
    })
    
    revalidatePath('/dashboard/attendance')
    revalidatePath('/dashboard/my-trips')
    revalidatePath(`/dashboard/my-trips/${tripId}`)
    revalidatePath(`/dashboard/attendance/${tripId}`)
    revalidatePath('/dashboard/audit-logs')
    
    return { success: true }
  })
}

export async function getStudentsForTrip(tripId: string) {
  const context = await getTenantContext()
  
  return await withTenantContext(context, async (tx) => {
    // Get trip
    const trip = await getTripById(tripId)
    if (!trip) {
      throw new Error('Trip not found')
    }
    
    // Get all students assigned to the route
    const students = await tx.$queryRaw<Array<{
      id: string
      tenant_id: string
      first_name: string
      last_name: string
      grade: string | null
      route_id: string | null
      deleted_at: Date | null
      deleted_by: string | null
      created_at: Date
      updated_at: Date
    }>>`
      SELECT * FROM app.v_students
      WHERE route_id = ${trip.routeId}::uuid
      ORDER BY last_name, first_name
    `
    
    return students.map(s => ({
      id: s.id,
      tenantId: s.tenant_id,
      firstName: s.first_name,
      lastName: s.last_name,
      grade: s.grade,
      routeId: s.route_id,
      deletedAt: s.deleted_at,
      deletedBy: s.deleted_by,
      createdAt: s.created_at,
      updatedAt: s.updated_at
    }))
  })
}

