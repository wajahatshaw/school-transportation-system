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
      pickup_address: string | null
      guardian_name: string | null
      guardian_phone: string | null
      school_name: string | null
      school_address: string | null
      school_phone: string | null
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
      pickupAddress: s.pickup_address,
      guardianName: s.guardian_name,
      guardianPhone: s.guardian_phone,
      schoolName: s.school_name,
      schoolAddress: s.school_address,
      schoolPhone: s.school_phone,
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
  pickupAddress?: string
  guardianName?: string
  guardianPhone?: string
  schoolName?: string
  schoolAddress?: string
  schoolPhone?: string
}) {
  const context = await getTenantContext()
  
  return await withTenantContext(context, async (tx) => {
    const student = await tx.student.create({
      data: {
        tenantId: context.tenantId,
        firstName: data.firstName,
        lastName: data.lastName,
        grade: data.grade,
        studentAddress: data.studentAddress,
        pickupAddress: data.pickupAddress,
        guardianName: data.guardianName,
        guardianPhone: data.guardianPhone,
        schoolName: data.schoolName,
        schoolAddress: data.schoolAddress,
        schoolPhone: data.schoolPhone,
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
    pickupAddress?: string | null
    guardianName?: string | null
    guardianPhone?: string | null
    schoolName?: string | null
    schoolAddress?: string | null
    schoolPhone?: string | null
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
    
    const student = await tx.student.update({
      where: { id },
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        grade: data.grade,
        studentAddress: data.studentAddress === undefined ? undefined : data.studentAddress,
        pickupAddress: data.pickupAddress === undefined ? undefined : data.pickupAddress,
        guardianName: data.guardianName === undefined ? undefined : data.guardianName,
        guardianPhone: data.guardianPhone === undefined ? undefined : data.guardianPhone,
        schoolName: data.schoolName === undefined ? undefined : data.schoolName,
        schoolAddress: data.schoolAddress === undefined ? undefined : data.schoolAddress,
        schoolPhone: data.schoolPhone === undefined ? undefined : data.schoolPhone,
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
    // Get route with vehicle
    const route = await getRouteById(routeId)
    if (!route) {
      throw new Error('Route not found')
    }
    
    // Count students assigned to route
    const studentCount = await tx.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count
      FROM app.v_students
      WHERE route_id = ${routeId}::uuid
    `
    
    const assigned = Number(studentCount[0]?.count || 0)
    const capacity = route.vehicle?.capacity || 0
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
