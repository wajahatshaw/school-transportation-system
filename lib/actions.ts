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
      student_address: string | null
      morning_pickup_time: string | null
      morning_drop_time: string | null
      afternoon_pickup_time: string | null
      afternoon_drop_time: string | null
      guardian_name: string | null
      guardian_phone: string | null
      school_name: string | null
      school_address: string | null
      school_phone: string | null
      vehicle_id: string | null
      driver_id: string | null
      serial_no: string | null
      run_id: string | null
      route_id: string | null
      deleted_at: Date | null
      deleted_by: string | null
      created_at: Date | null
      updated_at: Date | null
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
      studentAddress: s.student_address,
      morningPickupTime: s.morning_pickup_time,
      morningDropTime: s.morning_drop_time,
      afternoonPickupTime: s.afternoon_pickup_time,
      afternoonDropTime: s.afternoon_drop_time,
      guardianName: s.guardian_name,
      guardianPhone: s.guardian_phone,
      schoolName: s.school_name,
      schoolAddress: s.school_address,
      schoolPhone: s.school_phone,
      vehicleId: s.vehicle_id,
      driverId: s.driver_id,
      serialNo: s.serial_no,
      runId: s.run_id,
      routeId: s.route_id,
      deletedAt: s.deleted_at,
      deletedBy: s.deleted_by,
      createdAt: s.created_at,
      updatedAt: s.updated_at
    }))
  })
}

export async function createStudent(data: {
  firstName: string
  lastName: string
  grade?: string
  studentAddress?: string
  morningPickupTime?: string
  morningDropTime?: string
  afternoonPickupTime?: string
  afternoonDropTime?: string
  guardianName?: string
  guardianPhone?: string
  schoolName?: string
  schoolAddress?: string
  schoolPhone?: string
  vehicleId?: string
  driverId?: string
  serialNo?: string
  runId?: string
  routeId?: string
}) {
  const context = await getTenantContext()
  
  return await withTenantContext(context, async (tx) => {
    const student = await tx.student.create({
      data: {
        tenantId: context.tenantId,
        firstName: data.firstName,
        lastName: data.lastName,
        grade: data.grade,
        routeId: data.routeId,
        studentAddress: data.studentAddress,
        morningPickupTime: data.morningPickupTime,
        morningDropTime: data.morningDropTime,
        afternoonPickupTime: data.afternoonPickupTime,
        afternoonDropTime: data.afternoonDropTime,
        guardianName: data.guardianName,
        guardianPhone: data.guardianPhone,
        schoolName: data.schoolName,
        schoolAddress: data.schoolAddress,
        schoolPhone: data.schoolPhone,
        vehicleId: data.vehicleId,
        driverId: data.driverId,
        serialNo: data.serialNo,
        runId: data.runId,
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
  data: {
    firstName: string
    lastName: string
    grade?: string
    studentAddress?: string | null
    morningPickupTime?: string | null
    morningDropTime?: string | null
    afternoonPickupTime?: string | null
    afternoonDropTime?: string | null
    guardianName?: string | null
    guardianPhone?: string | null
    schoolName?: string | null
    schoolAddress?: string | null
    schoolPhone?: string | null
    vehicleId?: string | null
    driverId?: string | null
    serialNo?: string | null
    runId?: string | null
    routeId?: string | null
  }
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
        ...(data.routeId === undefined ? {} : { routeId: data.routeId }),
        studentAddress: data.studentAddress === undefined ? undefined : data.studentAddress,
        morningPickupTime: data.morningPickupTime === undefined ? undefined : data.morningPickupTime,
        morningDropTime: data.morningDropTime === undefined ? undefined : data.morningDropTime,
        afternoonPickupTime: data.afternoonPickupTime === undefined ? undefined : data.afternoonPickupTime,
        afternoonDropTime: data.afternoonDropTime === undefined ? undefined : data.afternoonDropTime,
        guardianName: data.guardianName === undefined ? undefined : data.guardianName,
        guardianPhone: data.guardianPhone === undefined ? undefined : data.guardianPhone,
        schoolName: data.schoolName === undefined ? undefined : data.schoolName,
        schoolAddress: data.schoolAddress === undefined ? undefined : data.schoolAddress,
        schoolPhone: data.schoolPhone === undefined ? undefined : data.schoolPhone,
        vehicleId: data.vehicleId === undefined ? undefined : data.vehicleId,
        driverId: data.driverId === undefined ? undefined : data.driverId,
        serialNo: data.serialNo === undefined ? undefined : data.serialNo,
        runId: data.runId === undefined ? undefined : data.runId,
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
  status?: string
  notes?: string
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
        fileUrl: data.fileUrl,
        status: data.status || 'valid',
        uploadedBy: context.userId,
        notes: data.notes
      }
    })
    
    // Log to audit_logs
    await tx.$executeRaw`
      INSERT INTO audit_logs (
        tenant_id, table_name, record_id, action, after, user_id
      )
      VALUES (
        ${context.tenantId}::uuid,
        'driver_compliance_documents',
        ${doc.id}::uuid,
        'create',
        ${JSON.stringify({
          driverId: doc.driverId,
          docType: doc.docType,
          expiresAt: doc.expiresAt
        })}::jsonb,
        ${context.userId}::uuid
      )
    `
    
    revalidatePath(`/dashboard/drivers/${data.driverId}/compliance`)
    revalidatePath('/dashboard/compliance')
    revalidatePath('/dashboard')
    revalidatePath('/dashboard/audit-logs')
    
    return doc
  })
}

export async function updateComplianceDocument(
  id: string,
  data: { docType: string; issuedAt?: Date; expiresAt: Date; fileUrl?: string; status?: string; notes?: string }
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
    
    const beforeData = {
      docType: existing.docType,
      expiresAt: existing.expiresAt,
      status: existing.status,
      notes: existing.notes
    }
    
    const doc = await tx.driverComplianceDocument.update({
      where: { id },
      data: {
        docType: data.docType,
        issuedAt: data.issuedAt,
        expiresAt: data.expiresAt,
        fileUrl: data.fileUrl,
        status: data.status,
        notes: data.notes
      }
    })
    
    // Log to audit_logs
    await tx.$executeRaw`
      INSERT INTO audit_logs (
        tenant_id, table_name, record_id, action, before, after, user_id
      )
      VALUES (
        ${context.tenantId}::uuid,
        'driver_compliance_documents',
        ${doc.id}::uuid,
        'update',
        ${JSON.stringify(beforeData)}::jsonb,
        ${JSON.stringify({
          docType: doc.docType,
          expiresAt: doc.expiresAt,
          status: doc.status,
          notes: doc.notes
        })}::jsonb,
        ${context.userId}::uuid
      )
    `
    
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
    
    const beforeData = {
      docType: doc.docType,
      driverId: doc.driverId,
      expiresAt: doc.expiresAt
    }
    
    // Soft delete using UPDATE, not DELETE
    await tx.driverComplianceDocument.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deletedBy: context.userId
      }
    })
    
    // Log to audit_logs
    await tx.$executeRaw`
      INSERT INTO audit_logs (
        tenant_id, table_name, record_id, action, before, after, user_id
      )
      VALUES (
        ${context.tenantId}::uuid,
        'driver_compliance_documents',
        ${doc.id}::uuid,
        'delete',
        ${JSON.stringify(beforeData)}::jsonb,
        ${JSON.stringify({ deletedAt: new Date().toISOString() })}::jsonb,
        ${context.userId}::uuid
      )
    `
    
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
    const [studentsCountRows, driversCountRows, routesCountRows, vehiclesCountRows, tenantsCountRows, complianceCountsRows, recentLogs] = await Promise.all([
      tx.$queryRaw<Array<{ count: bigint }>>`SELECT COUNT(*) as count FROM app.v_students`,
      tx.$queryRaw<Array<{ count: bigint }>>`SELECT COUNT(*) as count FROM app.v_drivers`,
      tx.$queryRaw<Array<{ count: bigint }>>`SELECT COUNT(*) as count FROM app.v_routes`,
      tx.$queryRaw<Array<{ count: bigint }>>`SELECT COUNT(*) as count FROM app.v_vehicles`,
      tx.$queryRaw<Array<{ count: bigint }>>`SELECT COUNT(*) as count FROM public.tenants`,
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
    const routesCount = Number(routesCountRows[0]?.count || 0)
    const vehiclesCount = Number(vehiclesCountRows[0]?.count || 0)
    const tenantsCount = Number(tenantsCountRows[0]?.count || 0)
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
      routesCount,
      vehiclesCount,
      tenantsCount,
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

/**
 * Get total count of all tenants (schools) in the system
 * This bypasses RLS to get system-wide count
 */
export async function getTenantsCount() {
  const context = await getTenantContext()
  
  return await withTenantContext(context, async (tx) => {
    // Query tenants table directly (not through view) to get all tenants
    // Note: Tenant model doesn't have deleted_at column, so we count all tenants
    const result = await tx.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint as count
      FROM tenants
    `
    return Number(result[0]?.count || 0)
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
      manufacture_year: number | null
      model: string | null
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
      manufactureYear: v.manufacture_year,
      model: v.model,
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
  manufactureYear?: number
  model?: string
}) {
  const context = await getTenantContext()
  
  // Validate capacity
  if (!Number.isInteger(data.capacity) || data.capacity <= 0) {
    throw new Error('Vehicle capacity must be a positive number (e.g., 20, 30, 40)')
  }
  if (data.capacity > 60) {
    throw new Error('Vehicle capacity cannot exceed 60 seats. Please enter a value between 1 and 60.')
  }

  // Validate manufacture year if provided
  if (data.manufactureYear !== undefined) {
    const currentYear = new Date().getFullYear()
    if (!Number.isInteger(data.manufactureYear) || data.manufactureYear < 1900 || data.manufactureYear > currentYear + 1) {
      throw new Error(`Manufacture year must be between 1900 and ${currentYear + 1}`)
    }
  }

  // Validate name
  if (!data.name || data.name.trim().length === 0) {
    throw new Error('Vehicle name is required. Please enter a name for the vehicle.')
  }

  if (data.name.trim().length > 255) {
    throw new Error('Vehicle name is too long. Please use 255 characters or less.')
  }

  return await withTenantContext(context, async (tx) => {
    try {
    const vehicle = await tx.vehicle.create({
      data: {
        tenantId: context.tenantId,
          name: data.name.trim(),
        capacity: data.capacity,
          licensePlate: data.licensePlate?.trim() || null,
          vehicleType: data.vehicleType?.trim() || null,
          ...(data.manufactureYear !== undefined && { manufactureYear: data.manufactureYear }),
          ...(data.model !== undefined && { model: data.model?.trim() || null }),
      }
    })
    
    revalidatePath('/dashboard/vehicles')
    revalidatePath('/dashboard/routes')
    revalidatePath('/dashboard')
    revalidatePath('/dashboard/audit-logs')
    
    return vehicle
    } catch (error) {
      // Handle Prisma errors with user-friendly messages
      if (error instanceof Error) {
        if (error.message.includes('Unique constraint')) {
          throw new Error('A vehicle with this information already exists. Please check the details and try again.')
        }
        if (error.message.includes('Foreign key constraint')) {
          throw new Error('Invalid reference. Please ensure all related data is correct.')
        }
        if (error.message.includes('required')) {
          throw new Error('Missing required information. Please fill in all required fields.')
        }
        // Re-throw validation errors as-is (they're already user-friendly)
        if (error.message.includes('capacity') || error.message.includes('Manufacture year') || error.message.includes('Vehicle name')) {
          throw error
        }
        throw new Error('Failed to create vehicle. Please check your input and try again.')
      }
      throw new Error('An unexpected error occurred while creating the vehicle. Please try again.')
    }
  })
}

export async function updateVehicle(
  id: string, 
  data: { 
    name: string
    capacity: number
    licensePlate?: string
    vehicleType?: string
    manufactureYear?: number
    model?: string
  }
) {
  const context = await getTenantContext()
  
  // Validate capacity
  if (!Number.isInteger(data.capacity) || data.capacity <= 0) {
    throw new Error('Vehicle capacity must be a positive number (e.g., 20, 30, 40)')
  }
  if (data.capacity > 60) {
    throw new Error('Vehicle capacity cannot exceed 60 seats. Please enter a value between 1 and 60.')
  }

  // Validate manufacture year if provided
  if (data.manufactureYear !== undefined) {
    const currentYear = new Date().getFullYear()
    if (!Number.isInteger(data.manufactureYear) || data.manufactureYear < 1900 || data.manufactureYear > currentYear + 1) {
      throw new Error(`Manufacture year must be between 1900 and ${currentYear + 1}`)
    }
  }

  // Validate name
  if (!data.name || data.name.trim().length === 0) {
    throw new Error('Vehicle name is required. Please enter a name for the vehicle.')
  }

  if (data.name.trim().length > 255) {
    throw new Error('Vehicle name is too long. Please use 255 characters or less.')
  }

  return await withTenantContext(context, async (tx) => {
    // WORKAROUND: Explicit tenant check because postgres role has BYPASSRLS
    const existing = await tx.vehicle.findFirst({
      where: { id, tenantId: context.tenantId }
    })
    if (!existing) {
      throw new Error('Vehicle not found. It may have been deleted or you may not have permission to access it.')
    }
    
    try {
    const vehicle = await tx.vehicle.update({
      where: { id },
      data: {
          name: data.name.trim(),
        capacity: data.capacity,
          licensePlate: data.licensePlate?.trim() || null,
          vehicleType: data.vehicleType?.trim() || null,
          ...(data.manufactureYear !== undefined && { manufactureYear: data.manufactureYear }),
          ...(data.model !== undefined && { model: data.model?.trim() || null }),
      }
    })
    
    revalidatePath('/dashboard/vehicles')
    revalidatePath('/dashboard/routes')
    revalidatePath('/dashboard')
    revalidatePath('/dashboard/audit-logs')
    
    return vehicle
    } catch (error) {
      // Handle Prisma errors with user-friendly messages
      if (error instanceof Error) {
        if (error.message.includes('Unique constraint')) {
          throw new Error('A vehicle with this information already exists. Please check the details and try again.')
        }
        if (error.message.includes('Foreign key constraint')) {
          throw new Error('Invalid reference. Please ensure all related data is correct.')
        }
        if (error.message.includes('required')) {
          throw new Error('Missing required information. Please fill in all required fields.')
        }
        // Re-throw validation errors as-is (they're already user-friendly)
        if (error.message.includes('capacity') || error.message.includes('Manufacture year') || error.message.includes('Vehicle name')) {
          throw error
        }
        throw new Error('Failed to update vehicle. Please check your input and try again.')
      }
      throw new Error('An unexpected error occurred while updating the vehicle. Please try again.')
    }
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

// ============================================================================
// VEHICLE MAINTENANCE DOCS CRUD - All operations rely on RLS
// ============================================================================

export async function getVehicleMaintenanceDocuments(vehicleId: string) {
  const context = await getTenantContext()
  
  return await withTenantContext(context, async (tx) => {
    // DATABASE-LEVEL: Using view for true database-enforced tenant isolation
    const docs = await tx.$queryRaw<Array<{
      id: string
      tenant_id: string
      vehicle_id: string
      maintenance_doc_url: string | null
      notes: string | null
      scheduled_date: Date | null
      maintenance_status: string
      completed_date: Date | null
      deleted_at: Date | null
      deleted_by: string | null
      created_at: Date
      updated_at: Date
    }>>`
      SELECT * FROM app.v_vehicle_maintenance_docs
      WHERE vehicle_id = ${vehicleId}::uuid
      ORDER BY scheduled_date DESC NULLS LAST, created_at DESC
    `
    
    return docs.map(d => ({
      id: d.id,
      tenantId: d.tenant_id,
      vehicleId: d.vehicle_id,
      maintenanceDocUrl: d.maintenance_doc_url,
      notes: d.notes,
      scheduledDate: d.scheduled_date,
      maintenanceStatus: d.maintenance_status,
      completedDate: d.completed_date,
      deletedAt: d.deleted_at,
      deletedBy: d.deleted_by,
      createdAt: d.created_at,
      updatedAt: d.updated_at
    }))
  })
}

export async function createVehicleMaintenanceDocument(data: {
  vehicleId: string
  maintenanceDocUrl?: string
  notes?: string
  scheduledDate?: Date
  maintenanceStatus?: string
  completedDate?: Date
}) {
  const context = await getTenantContext()
  
  return await withTenantContext(context, async (tx) => {
    // Verify vehicle exists and belongs to tenant
    const vehicle = await tx.vehicle.findFirst({
      where: { id: data.vehicleId, tenantId: context.tenantId, deletedAt: null }
    })
    
    if (!vehicle) {
      throw new Error('Vehicle not found or access denied')
    }
    
    const doc = await tx.vehicleMaintenanceDoc.create({
      data: {
        vehicleId: data.vehicleId,
        maintenanceDocUrl: data.maintenanceDocUrl,
        notes: data.notes?.trim() || null,
        scheduledDate: data.scheduledDate,
        maintenanceStatus: data.maintenanceStatus || 'pending',
        completedDate: data.completedDate
      }
    })
    
    revalidatePath(`/dashboard/vehicles/${data.vehicleId}/maintenance`)
    revalidatePath('/dashboard/vehicles')
    revalidatePath('/dashboard')
    revalidatePath('/dashboard/audit-logs')
    
    return doc
  })
}

export async function updateVehicleMaintenanceDocument(
  id: string,
  data: {
    maintenanceDocUrl?: string
    notes?: string
    scheduledDate?: Date
    maintenanceStatus?: string
    completedDate?: Date
  }
) {
  const context = await getTenantContext()
  
  return await withTenantContext(context, async (tx) => {
    // Get existing document and verify access via vehicle
    const existing = await tx.$queryRaw<Array<{
      id: string
      vehicle_id: string
    }>>`
      SELECT vmd.id, vmd.vehicle_id
      FROM vehicle_maintenance_docs vmd
      INNER JOIN vehicles v ON v.id = vmd.vehicle_id
      WHERE vmd.id = ${id}::uuid
        AND v.tenant_id = ${context.tenantId}::uuid
        AND vmd.deleted_at IS NULL
        AND v.deleted_at IS NULL
    `
    
    if (!existing || existing.length === 0) {
      throw new Error('Document not found or access denied')
    }
    
    const vehicleId = existing[0].vehicle_id
    
    const doc = await tx.vehicleMaintenanceDoc.update({
      where: { id },
      data: {
        ...(data.maintenanceDocUrl !== undefined && { maintenanceDocUrl: data.maintenanceDocUrl }),
        ...(data.notes !== undefined && { notes: data.notes?.trim() || null }),
        ...(data.scheduledDate !== undefined && { scheduledDate: data.scheduledDate }),
        ...(data.maintenanceStatus !== undefined && { maintenanceStatus: data.maintenanceStatus }),
        ...(data.completedDate !== undefined && { completedDate: data.completedDate }),
      }
    })
    
    revalidatePath(`/dashboard/vehicles/${vehicleId}/maintenance`)
    revalidatePath('/dashboard/vehicles')
    revalidatePath('/dashboard')
    revalidatePath('/dashboard/audit-logs')
    
    return doc
  })
}

export async function deleteVehicleMaintenanceDocument(id: string) {
  const context = await getTenantContext()
  
  return await withTenantContext(context, async (tx) => {
    // Get existing document and verify access via vehicle
    const existing = await tx.$queryRaw<Array<{
      id: string
      vehicle_id: string
    }>>`
      SELECT vmd.id, vmd.vehicle_id
      FROM vehicle_maintenance_docs vmd
      INNER JOIN vehicles v ON v.id = vmd.vehicle_id
      WHERE vmd.id = ${id}::uuid
        AND v.tenant_id = ${context.tenantId}::uuid
        AND vmd.deleted_at IS NULL
        AND v.deleted_at IS NULL
    `
    
    if (!existing || existing.length === 0) {
      throw new Error('Document not found or access denied')
    }
    
    const vehicleId = existing[0].vehicle_id
    
    // Soft delete
    await tx.vehicleMaintenanceDoc.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deletedBy: context.userId
      }
    })
    
    revalidatePath(`/dashboard/vehicles/${vehicleId}/maintenance`)
    revalidatePath('/dashboard/vehicles')
    revalidatePath('/dashboard')
    revalidatePath('/dashboard/audit-logs')
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
      manufacture_year: number | null
      model: string | null
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
      manufactureYear: v.manufacture_year,
      model: v.model,
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

// ============================================================================
// PAYMENTS & INVOICES CRUD - All operations rely on RLS
// ============================================================================

export async function getInvoices(filters?: {
  status?: string
  startDate?: Date
  endDate?: Date
  search?: string
}) {
  const context = await getTenantContext()
  
  return await withTenantContext(context, async (tx) => {
    let query = `
      SELECT * FROM app.v_invoices
      WHERE 1=1
    `
    const params: any[] = []
    let paramIndex = 1
    
    if (filters?.status) {
      query += ` AND status = $${paramIndex}`
      params.push(filters.status)
      paramIndex++
    }
    
    if (filters?.startDate) {
      query += ` AND issue_date >= $${paramIndex}`
      params.push(filters.startDate)
      paramIndex++
    }
    
    if (filters?.endDate) {
      query += ` AND issue_date <= $${paramIndex}`
      params.push(filters.endDate)
      paramIndex++
    }
    
    if (filters?.search) {
      query += ` AND (invoice_number ILIKE $${paramIndex} OR notes ILIKE $${paramIndex})`
      params.push(`%${filters.search}%`)
      paramIndex++
    }
    
    query += ` ORDER BY created_at DESC`
    
    const invoices = await tx.$queryRawUnsafe<Array<{
      id: string
      tenant_id: string
      invoice_number: string
      status: string
      issue_date: Date
      due_date: Date
      subtotal: number
      tax: number | null
      total: number
      paid_amount: number
      outstanding_amount: number
      notes: string | null
      created_by: string
      created_at: Date | null
      updated_at: Date | null
    }>>(query, ...params)
    
    return invoices.map(inv => ({
      id: inv.id,
      tenantId: inv.tenant_id,
      invoiceNumber: inv.invoice_number,
      status: inv.status,
      issueDate: inv.issue_date,
      dueDate: inv.due_date,
      subtotal: Number(inv.subtotal),
      tax: inv.tax ? Number(inv.tax) : null,
      total: Number(inv.total),
      paidAmount: Number(inv.paid_amount),
      outstandingAmount: Number(inv.outstanding_amount),
      notes: inv.notes,
      createdBy: inv.created_by,
      createdAt: inv.created_at,
      updatedAt: inv.updated_at
    }))
  })
}

export async function getInvoice(invoiceId: string) {
  const context = await getTenantContext()
  
  return await withTenantContext(context, async (tx) => {
    const invoice = await tx.$queryRaw<Array<{
      id: string
      tenant_id: string
      invoice_number: string
      status: string
      issue_date: Date
      due_date: Date
      subtotal: number
      tax: number | null
      total: number
      paid_amount: number
      outstanding_amount: number
      notes: string | null
      created_by: string
      created_at: Date | null
      updated_at: Date | null
    }>>`
      SELECT * FROM app.v_invoices
      WHERE id = ${invoiceId}::uuid
      LIMIT 1
    `
    
    if (!invoice || invoice.length === 0) {
      return null
    }
    
    const inv = invoice[0]

    // Get line items
    const lineItems = await tx.$queryRaw<Array<{
      id: string
      invoice_id: string
      item_type: string
      route_id: string | null
      student_id: string | null
      description: string
      quantity: number
      unit_price: number
      total: number
      created_at: Date | null
    }>>`
      SELECT * FROM app.v_invoice_line_items
      WHERE invoice_id = ${invoiceId}::uuid
      ORDER BY COALESCE(created_at, '1970-01-01'::timestamp) ASC
    `
    
    // Get payments
    const payments = await tx.$queryRaw<Array<{
      id: string
      tenant_id: string
      invoice_id: string
      amount: number
      payment_date: Date
      payment_method: string
      reference_number: string | null
      notes: string | null
      recorded_by: string
      created_at: Date | null
      updated_at: Date | null
    }>>`
      SELECT * FROM app.v_payments
      WHERE invoice_id = ${invoiceId}::uuid
      ORDER BY payment_date DESC, created_at DESC
    `
    
    // Format dates to ISO strings for JSON serialization
    const formatDate = (date: Date | null) => {
      if (!date) return null
      return date instanceof Date ? date.toISOString() : new Date(date).toISOString()
    }
    
    return {
      id: inv.id,
      tenantId: inv.tenant_id,
      invoiceNumber: inv.invoice_number,
      status: inv.status,
      issueDate: formatDate(inv.issue_date),
      dueDate: formatDate(inv.due_date),
      subtotal: Number(inv.subtotal),
      tax: inv.tax ? Number(inv.tax) : null,
      total: Number(inv.total),
      paidAmount: Number(inv.paid_amount),
      outstandingAmount: Number(inv.outstanding_amount),
      notes: inv.notes,
      createdBy: inv.created_by,
      createdAt: inv.created_at ? formatDate(inv.created_at) : null,
      updatedAt: inv.updated_at ? formatDate(inv.updated_at) : null,
      lineItems: lineItems.map(li => ({
        id: li.id,
        invoiceId: li.invoice_id,
        itemType: li.item_type,
        routeId: li.route_id,
        studentId: li.student_id,
        description: li.description,
        quantity: Number(li.quantity),
        unitPrice: Number(li.unit_price),
        total: Number(li.total)
      })),
      payments: payments.map(p => ({
        id: p.id,
        tenantId: p.tenant_id,
        invoiceId: p.invoice_id,
        amount: Number(p.amount),
        paymentDate: p.payment_date,
        paymentMethod: p.payment_method,
        referenceNumber: p.reference_number,
        notes: p.notes,
        recordedBy: p.recorded_by,
        createdAt: p.created_at,
        updatedAt: p.updated_at
      }))
    }
  })
}

export async function createInvoice(data: {
  status?: string
  issueDate: Date
  dueDate: Date
  subtotal: number
  tax?: number
  total: number
  notes?: string
  lineItems: Array<{
    itemType: string
    routeId?: string
    studentId?: string
    description: string
    quantity: number
    unitPrice: number
    total: number
  }>
}) {
  const context = await getTenantContext()
  
  return await withTenantContext(context, async (tx) => {
    // Generate invoice number
    const invoiceNumberResult = await tx.$queryRaw<Array<{ invoice_number: string }>>`
      SELECT app.generate_invoice_number(${context.tenantId}::uuid) as invoice_number
    `
    const invoiceNumber = invoiceNumberResult[0].invoice_number
    
    // Create invoice
    const invoice = await tx.invoice.create({
      data: {
        tenantId: context.tenantId,
        invoiceNumber,
        status: data.status || 'draft',
        issueDate: data.issueDate,
        dueDate: data.dueDate,
        subtotal: data.subtotal,
        tax: data.tax ?? 0,
        total: data.total,
        paidAmount: 0,
        outstandingAmount: data.total,
        notes: data.notes,
        createdBy: context.userId
      }
    })
    
    // Create line items
    for (const item of data.lineItems) {
      await tx.invoiceLineItem.create({
        data: {
          invoiceId: invoice.id,
          tenantId: context.tenantId,
          itemType: item.itemType,
          routeId: item.routeId || null,
          studentId: item.studentId || null,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          total: item.total
        }
      })
    }
    
    revalidatePath('/dashboard/payments')
    revalidatePath('/dashboard/audit-logs')
    
    return invoice
  })
}

export async function updateInvoice(
  invoiceId: string,
  data: {
    status?: string
    issueDate?: Date
    dueDate?: Date
    subtotal?: number
    tax?: number
    total?: number
    notes?: string
    lineItems?: Array<{
      id?: string
      itemType: string
      routeId?: string
      studentId?: string
      description: string
      quantity: number
      unitPrice: number
      total: number
    }>
  }
) {
  const context = await getTenantContext()
  
  return await withTenantContext(context, async (tx) => {
    const existing = await tx.invoice.findFirst({
      where: { id: invoiceId, tenantId: context.tenantId },
      include: { lineItems: true }
    })
    
    if (!existing) {
      throw new Error('Invoice not found or access denied')
    }

    // Check if invoice can be edited (not paid or cancelled)
    if (existing.status === 'paid' || existing.status === 'cancelled') {
      throw new Error(`Cannot edit invoice with status: ${existing.status}`)
    }
    
    const updateData: any = {}
    if (data.status !== undefined) updateData.status = data.status
    if (data.issueDate !== undefined) updateData.issueDate = data.issueDate
    if (data.dueDate !== undefined) updateData.dueDate = data.dueDate
    if (data.subtotal !== undefined) updateData.subtotal = data.subtotal
    if (data.tax !== undefined) updateData.tax = data.tax
    if (data.total !== undefined) {
      updateData.total = data.total
      // Recalculate outstanding amount
      updateData.outstandingAmount = data.total - existing.paidAmount
    }
    if (data.notes !== undefined) updateData.notes = data.notes
    updateData.updatedAt = new Date()
    
    const invoice = await tx.invoice.update({
      where: { id: invoiceId },
      data: updateData
    })

    // Update line items if provided
    if (data.lineItems !== undefined) {
      // Get existing line item IDs
      const existingLineItemIds = existing.lineItems.map(item => item.id)
      const newLineItemIds = data.lineItems
        .map(item => item.id)
        .filter((id): id is string => !!id)

      // Delete line items that are no longer in the list
      const itemsToDelete = existingLineItemIds.filter(id => !newLineItemIds.includes(id))
      if (itemsToDelete.length > 0) {
        await tx.invoiceLineItem.deleteMany({
          where: {
            id: { in: itemsToDelete },
            invoiceId: invoiceId
          }
        })
      }

      // Update or create line items
      for (const item of data.lineItems) {
        if (item.id && existingLineItemIds.includes(item.id)) {
          // Update existing line item
          await tx.invoiceLineItem.update({
            where: { id: item.id },
            data: {
              itemType: item.itemType,
              routeId: item.routeId || null,
              studentId: item.studentId || null,
              description: item.description,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              total: item.total
            }
          })
        } else {
          // Create new line item
          await tx.invoiceLineItem.create({
            data: {
              invoiceId: invoice.id,
              tenantId: context.tenantId,
              itemType: item.itemType,
              routeId: item.routeId || null,
              studentId: item.studentId || null,
              description: item.description,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              total: item.total
            }
          })
        }
      }
    }
    
    revalidatePath('/dashboard/payments')
    revalidatePath(`/dashboard/payments/${invoiceId}`)
    revalidatePath('/dashboard/audit-logs')
    
    return invoice
  })
}

export async function cancelInvoice(invoiceId: string) {
  const context = await getTenantContext()
  
  return await withTenantContext(context, async (tx) => {
    const existing = await tx.invoice.findFirst({
      where: { id: invoiceId, tenantId: context.tenantId }
    })
    
    if (!existing) {
      throw new Error('Invoice not found or access denied')
    }
    
    if (existing.status === 'paid') {
      throw new Error('Cannot cancel a paid invoice')
    }
    
    const invoice = await tx.invoice.update({
      where: { id: invoiceId },
      data: {
        status: 'cancelled',
        updatedAt: new Date()
      }
    })
    
    revalidatePath('/dashboard/payments')
    revalidatePath(`/dashboard/payments/${invoiceId}`)
    revalidatePath('/dashboard/audit-logs')
    
    return invoice
  })
}

export async function recordPayment(
  invoiceId: string,
  data: {
    amount: number
    paymentDate: Date
    paymentMethod: string
    referenceNumber?: string
    notes?: string
  }
) {
  const context = await getTenantContext()
  
  return await withTenantContext(context, async (tx) => {
    const invoice = await tx.invoice.findFirst({
      where: { id: invoiceId, tenantId: context.tenantId }
    })
    
    if (!invoice) {
      throw new Error('Invoice not found or access denied')
    }
    
    if (invoice.status === 'cancelled') {
      throw new Error('Cannot record payment for a cancelled invoice')
    }
    
    // Validate payment amount doesn't exceed outstanding
    const newOutstanding = invoice.outstandingAmount - data.amount
    if (newOutstanding < 0) {
      throw new Error('Payment amount exceeds outstanding balance')
    }
    
    // Create payment (trigger will update invoice automatically)
    const payment = await tx.payment.create({
      data: {
        tenantId: context.tenantId,
        invoiceId: invoiceId,
        amount: data.amount,
        paymentDate: data.paymentDate,
        paymentMethod: data.paymentMethod,
        referenceNumber: data.referenceNumber,
        notes: data.notes,
        recordedBy: context.userId
      }
    })
    
    revalidatePath('/dashboard/payments')
    revalidatePath(`/dashboard/payments/${invoiceId}`)
    revalidatePath('/dashboard/audit-logs')
    
    return payment
  })
}

export async function getOutstandingBalances() {
  const context = await getTenantContext()
  
  return await withTenantContext(context, async (tx) => {
    const totalResult = await tx.$queryRaw<Array<{
      total_outstanding: number
    }>>`
      SELECT COALESCE(SUM(outstanding_amount), 0) as total_outstanding
      FROM app.v_invoices
      WHERE outstanding_amount > 0
    `
    
    const statusResult = await tx.$queryRaw<Array<{
      status: string
      amount: number
    }>>`
      SELECT status, SUM(outstanding_amount) as amount
      FROM app.v_invoices
      WHERE outstanding_amount > 0
      GROUP BY status
    `
    
    const byStatus: Record<string, number> = {}
    statusResult.forEach((row: any) => {
      byStatus[row.status] = Number(row.amount)
    })
    
    return {
      totalOutstanding: Number(totalResult[0]?.total_outstanding || 0),
      byStatus
    }
  })
}

export async function getAgingReport() {
  const context = await getTenantContext()
  
  return await withTenantContext(context, async (tx) => {
    const result = await tx.$queryRaw<Array<{
      invoice_id: string
      invoice_number: string
      due_date: Date
      outstanding_amount: number
      days_past_due: number
    }>>`
      SELECT 
        id as invoice_id,
        invoice_number,
        due_date,
        outstanding_amount,
        CASE 
          WHEN due_date >= CURRENT_DATE THEN 0
          ELSE CURRENT_DATE - due_date
        END as days_past_due
      FROM app.v_invoices
      WHERE outstanding_amount > 0
        AND status != 'cancelled'
      ORDER BY due_date ASC
    `
    
    return result.map(r => ({
      invoiceId: r.invoice_id,
      invoiceNumber: r.invoice_number,
      dueDate: r.due_date,
      outstandingAmount: Number(r.outstanding_amount),
      daysPastDue: Number(r.days_past_due),
      agingBucket: r.days_past_due <= 30 ? 'current' :
                   r.days_past_due <= 60 ? '31-60' :
                   r.days_past_due <= 90 ? '61-90' : '90+'
    }))
  })
}

export async function getPaymentsSummary() {
  const context = await getTenantContext()
  
  return await withTenantContext(context, async (tx) => {
    const result = await tx.$queryRaw<Array<{
      total_invoices: number
      total_paid: number
      total_outstanding: number
      overdue_count: number
    }>>`
      SELECT 
        COUNT(*) as total_invoices,
        COALESCE(SUM(CASE WHEN status = 'paid' THEN total ELSE 0 END), 0) as total_paid,
        COALESCE(SUM(outstanding_amount), 0) as total_outstanding,
        COUNT(*) FILTER (WHERE status = 'overdue' OR (due_date < CURRENT_DATE AND status NOT IN ('paid', 'cancelled'))) as overdue_count
      FROM app.v_invoices
    `
    
    return {
      totalInvoices: Number(result[0]?.total_invoices || 0),
      totalPaid: Number(result[0]?.total_paid || 0),
      totalOutstanding: Number(result[0]?.total_outstanding || 0),
      overdueCount: Number(result[0]?.overdue_count || 0)
    }
  })
}

