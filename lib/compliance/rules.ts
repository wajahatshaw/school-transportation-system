import { withTenantContext, getTenantContext } from '../withTenantContext'
import { PrismaClient, Prisma } from '@prisma/client'

export type ComplianceStatus = 'valid' | 'expiring' | 'expired' | 'missing' | 'pending_review'

export interface ComplianceRule {
  id: string
  tenantId: string
  role: string
  docType: string
  required: boolean
  graceDays: number
  alertWindows: number[] // e.g., [30, 15, 7] days before expiry
}

export interface DocumentEvaluation {
  docId: string
  docType: string
  status: ComplianceStatus
  expiresAt: Date
  daysUntilExpiry: number
  isRequired: boolean
}

export interface DriverEvaluation {
  driverId: string
  compliant: boolean
  complianceScore: number // 0-100
  expiredCount: number
  expiringCount: number
  missingCount: number
  documents: DocumentEvaluation[]
  missingRequiredDocs: string[]
}

export interface TenantEvaluation {
  tenantId: string
  totalDrivers: number
  compliantDrivers: number
  nonCompliantDrivers: number
  compliancePercentage: number
  expiredCount: number
  expiringCount: number
  missingCount: number
  topIssues: Array<{ docType: string; count: number }>
}

export const DEFAULT_ALERT_WINDOWS = [30, 15, 7] // days before expiry
export const DEFAULT_REQUIRED_DOCS = [
  'Driver License',
  'Background Check'
]

/**
 * Get compliance rules for a tenant and role
 * Returns default rules if none are configured
 * Can be called with an existing transaction context to avoid nesting
 */
export async function getComplianceRules(role: string = 'driver', existingTx?: any): Promise<ComplianceRule[]> {
  const context = await getTenantContext()
  
  const queryRules = async (tx: any) => {
    try {
      const rules = await tx.$queryRaw<Array<{
        id: string
        tenant_id: string
        role: string
        doc_type: string
        required: boolean
        grace_days: number
        alert_windows_json: any
      }>>`
        SELECT * FROM app.v_compliance_rules
        WHERE role = ${role}
        ORDER BY doc_type
      `
      
      // If no rules exist, return defaults
      if (rules.length === 0) {
        return DEFAULT_REQUIRED_DOCS.map(docType => ({
          id: `default-${docType}`,
          tenantId: context.tenantId,
          role,
          docType,
          required: true,
          graceDays: 0,
          alertWindows: DEFAULT_ALERT_WINDOWS
        }))
      }
      
      return rules.map((r: {
        id: string
        tenant_id: string
        role: string
        doc_type: string
        required: boolean
        grace_days: number
        alert_windows_json: any
      }) => ({
        id: r.id,
        tenantId: r.tenant_id,
        role: r.role,
        docType: r.doc_type,
        required: r.required,
        graceDays: Number(r.grace_days || 0),
        alertWindows: Array.isArray(r.alert_windows_json) 
          ? r.alert_windows_json 
          : DEFAULT_ALERT_WINDOWS
      }))
    } catch (error) {
      // If view doesn't exist or there's a permission issue, return defaults
      console.warn('Error querying compliance rules, using defaults:', error)
      return DEFAULT_REQUIRED_DOCS.map(docType => ({
        id: `default-${docType}`,
        tenantId: context.tenantId,
        role,
        docType,
        required: true,
        graceDays: 0,
        alertWindows: DEFAULT_ALERT_WINDOWS
      }))
    }
  }
  
  // If an existing transaction is provided, use it (avoid nesting)
  if (existingTx) {
    return await queryRules(existingTx)
  }
  
  // Otherwise create a new transaction context
  return await withTenantContext(context, queryRules)
}

/**
 * Evaluate a single document's compliance status
 * OPTIMIZED: Made synchronous since it doesn't need async operations
 */
export function evaluateDocument(
  doc: {
    id: string
    docType: string
    expiresAt: Date | string
    status?: string | null
  },
  rules: ComplianceRule[]
): DocumentEvaluation {
  const expiresAt = new Date(doc.expiresAt)
  const now = new Date()
  const daysUntilExpiry = Math.floor((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  
  // Match rule by doc type (case-insensitive, trim whitespace)
  const rule = rules.find(
    r => r.docType?.trim().toLowerCase() === doc.docType?.trim().toLowerCase()
  )
  const isRequired = rule?.required ?? false
  
  // Check if expired (accounting for grace period)
  const graceDays = rule?.graceDays ?? 0
  if (daysUntilExpiry < -graceDays) {
    return {
      docId: doc.id,
      docType: doc.docType,
      status: 'expired',
      expiresAt,
      daysUntilExpiry,
      isRequired
    }
  }
  
  // Check if expiring (within ANY alert window)
  // This must match the logic in getDocumentsForAlerts() for consistency
  const alertWindows = rule?.alertWindows ?? DEFAULT_ALERT_WINDOWS
  const maxWindow = Math.max(...alertWindows) // Use max window to match alert generation logic
  if (daysUntilExpiry >= 0 && daysUntilExpiry <= maxWindow) {
    return {
      docId: doc.id,
      docType: doc.docType,
      status: 'expiring',
      expiresAt,
      daysUntilExpiry,
      isRequired
    }
  }
  
  // Check manual status override
  if (doc.status && ['pending_review', 'missing'].includes(doc.status)) {
    return {
      docId: doc.id,
      docType: doc.docType,
      status: doc.status as ComplianceStatus,
      expiresAt,
      daysUntilExpiry,
      isRequired
    }
  }
  
  // Valid
  return {
    docId: doc.id,
    docType: doc.docType,
    status: 'valid',
    expiresAt,
    daysUntilExpiry,
    isRequired
  }
}

/**
 * Evaluate a driver's compliance status
 * Can be called with an existing transaction context to avoid nesting
 */
export async function evaluateDriver(driverId: string, existingTx?: any): Promise<DriverEvaluation> {
  const context = await getTenantContext()
  
  const evaluate = async (tx: any) => {
    // Get rules (pass tx to avoid nested transaction)
    const rules = await getComplianceRules('driver', tx)
    
    // Get all documents for this driver
    // Query the table directly since we're in a tenant-scoped transaction
    const docs = await tx.$queryRaw<Array<{
      id: string
      doc_type: string
      expires_at: Date
      status: string | null
    }>>`
      SELECT 
        id, 
        doc_type, 
        expires_at, 
        COALESCE(status, 'valid') as status
      FROM driver_compliance_documents
      WHERE driver_id = ${driverId}::uuid
        AND tenant_id = app.get_current_tenant_id()
        AND deleted_at IS NULL
    `
    
    // Evaluate each document (now synchronous, no Promise.all needed)
    const documentEvaluations = docs.map((doc: {
      id: string
      doc_type: string
      expires_at: Date
      status: string | null
    }) => {
      // Find matching rule (case-insensitive)
      const matchingRule = rules.find(
        r => r.docType.trim().toLowerCase() === doc.doc_type?.trim().toLowerCase()
      )
      
      return evaluateDocument(
        {
          id: doc.id,
          docType: matchingRule?.docType || doc.doc_type, // Use rule's docType for consistency
          expiresAt: doc.expires_at,
          status: doc.status
        },
        rules
      )
    })
    
    // Find missing required documents
    // Normalize doc types for comparison (case-insensitive, trim whitespace)
    const existingDocTypes = new Set(
      docs.map((d: { doc_type: string }) => d.doc_type?.trim().toLowerCase() || '')
    )
    const requiredDocTypes = rules
      .filter((r: ComplianceRule) => r.required)
      .map((r: ComplianceRule) => r.docType)
    const missingRequiredDocs = requiredDocTypes.filter(
      (docType: string) => !existingDocTypes.has(docType?.trim().toLowerCase() || '')
    )
    
    // Count statuses (only for required documents)
    const expiredCount = documentEvaluations.filter(
      (d: DocumentEvaluation) => d.status === 'expired' && d.isRequired
    ).length
    const expiringCount = documentEvaluations.filter(
      (d: DocumentEvaluation) => d.status === 'expiring' && d.isRequired
    ).length
    const missingCount = missingRequiredDocs.length
    
    // Calculate compliance score (0-100) based on 4 factors:
    // 1. Missing required documents (most critical - reduces score)
    // 2. Expired documents (critical - reduces score, makes non-compliant)
    // 3. Expiring documents (warning - doesn't reduce score, but shows alert)
    // 4. Valid documents (positive - increases score)
    // 
    // Score = (Number of valid required documents / Total required documents) * 100
    // Compliant = (missingCount === 0 && expiredCount === 0 && score === 100)
    const totalRequired = requiredDocTypes.length
    
    if (totalRequired === 0) {
      // No requirements = 100% compliant
      return {
        driverId,
        compliant: true,
        complianceScore: 100,
        expiredCount: 0,
        expiringCount: 0,
        missingCount: 0,
        documents: documentEvaluations,
        missingRequiredDocs: []
      }
    }
    
    // Count valid required documents
    const validRequiredDocs = documentEvaluations.filter(
      (d: DocumentEvaluation) => d.isRequired && d.status === 'valid'
    ).length
    
    // Calculate score: (valid required docs / total required docs) * 100
    // Penalize for expired and missing, but don't double-count
    const compliantRequired = validRequiredDocs
    const complianceScore = Math.max(0, Math.round((compliantRequired / totalRequired) * 100))
    
    // Driver is compliant if:
    // - All required docs exist (no missing)
    // - No expired documents (within grace period)
    // - Score is 100% (all required docs are valid)
    const compliant = 
      missingCount === 0 && 
      expiredCount === 0 && 
      complianceScore === 100
    
    return {
      driverId,
      compliant,
      complianceScore,
      expiredCount,
      expiringCount,
      missingCount,
      documents: documentEvaluations,
      missingRequiredDocs
    }
  }
  
  // If an existing transaction is provided, use it (avoid nesting)
  if (existingTx) {
    return await evaluate(existingTx)
  }
  
  // Otherwise create a new transaction context
  return await withTenantContext(context, evaluate)
}

/**
 * Batch evaluate multiple drivers at once (OPTIMIZED)
 * Fetches all documents in one query, then evaluates in memory
 */
export async function evaluateDriversBatch(
  driverIds: string[],
  existingTx?: any
): Promise<Map<string, DriverEvaluation>> {
  const context = await getTenantContext()
  
  const evaluate = async (tx: any) => {
    if (driverIds.length === 0) {
      return new Map<string, DriverEvaluation>()
    }
    
    // Get compliance rules
    const rules = await getComplianceRules('driver', tx)
    
    // Fetch ALL documents for ALL drivers in ONE query (major optimization)
    const placeholders = driverIds.map((_, i) => `$${i + 1}::uuid`).join(', ')
    const allDocs = await tx.$queryRawUnsafe(
      `SELECT 
        id, 
        driver_id, 
        doc_type, 
        expires_at, 
        COALESCE(status, 'valid') as status
      FROM driver_compliance_documents
      WHERE driver_id IN (${placeholders})
        AND tenant_id = app.get_current_tenant_id()
        AND deleted_at IS NULL`,
      ...driverIds
    ) as Array<{
      id: string
      driver_id: string
      doc_type: string
      expires_at: Date
      status: string | null
    }>
    
    // Group documents by driver
    const docsByDriver = new Map<string, Array<{
      id: string
      doc_type: string
      expires_at: Date
      status: string | null
    }>>()
    
    allDocs.forEach((doc: {
      id: string
      driver_id: string
      doc_type: string
      expires_at: Date
      status: string | null
    }) => {
      if (!docsByDriver.has(doc.driver_id)) {
        docsByDriver.set(doc.driver_id, [])
      }
      docsByDriver.get(doc.driver_id)!.push({
        id: doc.id,
        doc_type: doc.doc_type,
        expires_at: doc.expires_at,
        status: doc.status
      })
    })
    
    // Evaluate all drivers (synchronous, no async needed)
    const results = new Map<string, DriverEvaluation>()
    
    driverIds.forEach((driverId) => {
      const driverDocs = docsByDriver.get(driverId) || []
      
      // Evaluate each document (synchronous)
      const documentEvaluations = driverDocs.map((doc) => {
        const matchingRule = rules.find(
          r => r.docType.trim().toLowerCase() === doc.doc_type?.trim().toLowerCase()
        )
        
        return evaluateDocument(
          {
            id: doc.id,
            docType: matchingRule?.docType || doc.doc_type,
            expiresAt: doc.expires_at,
            status: doc.status
          },
          rules
        )
      })
      
      // Find missing required documents
      const existingDocTypes = new Set(
        driverDocs.map(d => d.doc_type?.trim().toLowerCase() || '')
      )
      const requiredDocTypesList = rules
        .filter((r: ComplianceRule) => r.required)
        .map((r: ComplianceRule) => r.docType)
      const missingRequiredDocs = requiredDocTypesList.filter(
        (docType: string) => !existingDocTypes.has(docType?.trim().toLowerCase() || '')
      )
      
      // Count statuses (only for required documents)
      const expiredCount = documentEvaluations.filter(
        (d: DocumentEvaluation) => d.status === 'expired' && d.isRequired
      ).length
      const expiringCount = documentEvaluations.filter(
        (d: DocumentEvaluation) => d.status === 'expiring' && d.isRequired
      ).length
      const missingCount = missingRequiredDocs.length
      
      // Calculate compliance score
      const totalRequired = requiredDocTypesList.length
      
      if (totalRequired === 0) {
        results.set(driverId, {
          driverId,
          compliant: true,
          complianceScore: 100,
          expiredCount: 0,
          expiringCount: 0,
          missingCount: 0,
          documents: documentEvaluations,
          missingRequiredDocs: []
        })
        return
      }
      
      const validRequiredDocs = documentEvaluations.filter(
        (d: DocumentEvaluation) => d.isRequired && d.status === 'valid'
      ).length
      
      const complianceScore = Math.max(0, Math.round((validRequiredDocs / totalRequired) * 100))
      
      const compliant = 
        missingCount === 0 && 
        expiredCount === 0 && 
        complianceScore === 100
      
      results.set(driverId, {
        driverId,
        compliant,
        complianceScore,
        expiredCount,
        expiringCount,
        missingCount,
        documents: documentEvaluations,
        missingRequiredDocs
      })
    })
    
    return results
  }
  
  // If an existing transaction is provided, use it (avoid nesting)
  if (existingTx) {
    return await evaluate(existingTx)
  }
  
  // Otherwise create a new transaction context
  return await withTenantContext(context, evaluate)
}

/**
 * Evaluate tenant-level compliance
 */
export async function evaluateTenant(): Promise<TenantEvaluation> {
  const context = await getTenantContext()
  
  return await withTenantContext(context, async (tx) => {
    // Get compliance rules first to know which doc types are required
    const rules = await getComplianceRules('driver', tx)
    const requiredDocTypes = new Set(
      rules
        .filter((r: ComplianceRule) => r.required)
        .map((r: ComplianceRule) => r.docType)
    )
    
    // Get all active drivers
    const drivers = await tx.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM app.v_drivers WHERE deleted_at IS NULL
      LIMIT 1000
    `
    
    const driverIds = drivers.map(d => d.id)
    
    if (driverIds.length === 0) {
      return {
        tenantId: context.tenantId,
        totalDrivers: 0,
        compliantDrivers: 0,
        nonCompliantDrivers: 0,
        compliancePercentage: 100,
        expiredCount: 0,
        expiringCount: 0,
        missingCount: 0,
        topIssues: []
      }
    }
    
    // OPTIMIZATION: Fetch all documents in one query instead of per-driver
    // This is much faster than evaluating each driver individually
    // Build query with IN clause for better compatibility
    
    // Use IN clause with proper parameterization
    const placeholders = driverIds.map((_, i) => `$${i + 1}::uuid`).join(', ')
    const allDocs = await tx.$queryRawUnsafe<Array<{
      id: string
      driver_id: string
      doc_type: string
      expires_at: Date
      status: string | null
    }>>(
      `SELECT 
        id, 
        driver_id, 
        doc_type, 
        expires_at, 
        COALESCE(status, 'valid') as status
      FROM driver_compliance_documents
      WHERE driver_id IN (${placeholders})
        AND tenant_id = app.get_current_tenant_id()
        AND deleted_at IS NULL`,
      ...driverIds
    )
    
    // Group documents by driver
    const docsByDriver = new Map<string, Array<{
      id: string
      doc_type: string
      expires_at: Date
      status: string | null
    }>>()
    
    allDocs.forEach(doc => {
      if (!docsByDriver.has(doc.driver_id)) {
        docsByDriver.set(doc.driver_id, [])
      }
      docsByDriver.get(doc.driver_id)!.push({
        id: doc.id,
        doc_type: doc.doc_type,
        expires_at: doc.expires_at,
        status: doc.status
      })
    })
    
    // Evaluate all drivers (now synchronous, no Promise.all needed)
    const evaluations = driverIds.map((driverId) => {
      const driverDocs = docsByDriver.get(driverId) || []
      
      // Evaluate each document (synchronous now)
      const documentEvaluations = driverDocs.map((doc) => {
        // Find matching rule (case-insensitive)
        const matchingRule = rules.find(
          r => r.docType.trim().toLowerCase() === doc.doc_type?.trim().toLowerCase()
        )
        
        return evaluateDocument(
          {
            id: doc.id,
            docType: matchingRule?.docType || doc.doc_type,
            expiresAt: doc.expires_at,
            status: doc.status
          },
          rules
        )
      })
      
      // Find missing required documents
      const existingDocTypes = new Set(
        driverDocs.map(d => d.doc_type?.trim().toLowerCase() || '')
      )
      const requiredDocTypesList = rules
        .filter((r: ComplianceRule) => r.required)
        .map((r: ComplianceRule) => r.docType)
      const missingRequiredDocs = requiredDocTypesList.filter(
        (docType: string) => !existingDocTypes.has(docType?.trim().toLowerCase() || '')
      )
      
      // Count statuses (only for required documents)
      const expiredCount = documentEvaluations.filter(
        (d: DocumentEvaluation) => d.status === 'expired' && d.isRequired
      ).length
      const expiringCount = documentEvaluations.filter(
        (d: DocumentEvaluation) => d.status === 'expiring' && d.isRequired
      ).length
      const missingCount = missingRequiredDocs.length
      
      // Calculate compliance score
      const totalRequired = requiredDocTypesList.length
      
      if (totalRequired === 0) {
        return {
          driverId,
          compliant: true,
          complianceScore: 100,
          expiredCount: 0,
          expiringCount: 0,
          missingCount: 0,
          documents: documentEvaluations,
          missingRequiredDocs: []
        }
      }
      
      const validRequiredDocs = documentEvaluations.filter(
        (d: DocumentEvaluation) => d.isRequired && d.status === 'valid'
      ).length
      
      const complianceScore = Math.max(0, Math.round((validRequiredDocs / totalRequired) * 100))
      
      const compliant = 
        missingCount === 0 && 
        expiredCount === 0 && 
        complianceScore === 100
      
      return {
        driverId,
        compliant,
        complianceScore,
        expiredCount,
        expiringCount,
        missingCount,
        documents: documentEvaluations,
        missingRequiredDocs
      }
    })
    
    // Aggregate statistics
    const compliantDrivers = evaluations.filter(e => e.compliant).length
    const totalDrivers = evaluations.length
    const compliancePercentage = totalDrivers > 0
      ? Math.round((compliantDrivers / totalDrivers) * 100)
      : 100
    
    // Aggregate counts (only for required documents)
    const expiredCount = evaluations.reduce((sum, e) => {
      // Only count expired required documents
      const expiredRequired = e.documents.filter(
        d => d.status === 'expired' && d.isRequired && requiredDocTypes.has(d.docType)
      ).length
      return sum + expiredRequired
    }, 0)
    
    const expiringCount = evaluations.reduce((sum, e) => {
      // Only count expiring required documents
      const expiringRequired = e.documents.filter(
        d => d.status === 'expiring' && d.isRequired && requiredDocTypes.has(d.docType)
      ).length
      return sum + expiringRequired
    }, 0)
    
    const missingCount = evaluations.reduce((sum, e) => {
      // Only count missing required documents
      const missingRequired = e.missingRequiredDocs.filter(
        docType => requiredDocTypes.has(docType)
      ).length
      return sum + missingRequired
    }, 0)
    
    // Find top issues (most common missing/expired doc types)
    // Only count required document types
    
    const issueMap = new Map<string, number>()
    evaluations.forEach(driverEval => {
      // Count missing required documents
      driverEval.missingRequiredDocs.forEach(docType => {
        if (requiredDocTypes.has(docType)) {
          issueMap.set(docType, (issueMap.get(docType) || 0) + 1)
        }
      })
      // Count expired required documents only
      driverEval.documents
        .filter(d => d.status === 'expired' && d.isRequired && requiredDocTypes.has(d.docType))
        .forEach(doc => {
          issueMap.set(doc.docType, (issueMap.get(doc.docType) || 0) + 1)
        })
    })
    
    const topIssues = Array.from(issueMap.entries())
      .map(([docType, count]) => ({ docType, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
    
    return {
      tenantId: context.tenantId,
      totalDrivers,
      compliantDrivers,
      nonCompliantDrivers: totalDrivers - compliantDrivers,
      compliancePercentage,
      expiredCount,
      expiringCount,
      missingCount,
      topIssues
    }
  })
}

/**
 * Get documents that are expiring or expired within alert windows
 */
export async function getDocumentsForAlerts(): Promise<Array<{
  docId: string
  driverId: string
  docType: string
  expiresAt: Date
  alertType: 'expiring' | 'expired'
  alertWindowDays: number
}>> {
  const context = await getTenantContext()
  
  return await withTenantContext(context, async (tx) => {
    const rules = await getComplianceRules('driver', tx)
    const requiredDocTypes = new Set(
      rules
        .filter((r: ComplianceRule) => r.required)
        .map((r: ComplianceRule) => r.docType)
    )
    const now = new Date()
    
    // Get all active documents
    // Query the table directly since we're in a tenant-scoped transaction
    const docs = await tx.$queryRaw<Array<{
      id: string
      driver_id: string
      doc_type: string
      expires_at: Date
      status: string | null
    }>>`
      SELECT 
        id, 
        driver_id, 
        doc_type, 
        expires_at, 
        COALESCE(status, 'valid') as status
      FROM driver_compliance_documents
      WHERE tenant_id = app.get_current_tenant_id()
        AND deleted_at IS NULL
    `
    
    const alerts: Array<{
      docId: string
      driverId: string
      docType: string
      expiresAt: Date
      alertType: 'expiring' | 'expired'
      alertWindowDays: number
    }> = []
    
    for (const doc of docs) {
      // Find matching rule (case-insensitive)
      const rule = rules.find(
        r => r.docType.trim().toLowerCase() === doc.doc_type?.trim().toLowerCase()
      )
      
      // Only process alerts for required documents
      if (!rule || !rule.required || !requiredDocTypes.has(rule.docType)) {
        continue
      }
      
      const alertWindows = rule.alertWindows ?? DEFAULT_ALERT_WINDOWS
      const graceDays = rule.graceDays ?? 0
      
      const expiresAt = new Date(doc.expires_at)
      const daysUntilExpiry = Math.floor((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      
      // Check if expired
      if (daysUntilExpiry < -graceDays) {
        alerts.push({
          docId: doc.id,
          driverId: doc.driver_id,
          docType: rule.docType, // Use rule's docType for consistency
          expiresAt,
          alertType: 'expired',
          alertWindowDays: 0
        })
      } else {
        // Check each alert window (sorted descending to check largest first)
        // A document is "expiring" if it's within ANY alert window
        const sortedWindows = [...alertWindows].sort((a, b) => b - a) // Descending order
        for (const windowDays of sortedWindows) {
          if (daysUntilExpiry >= 0 && daysUntilExpiry <= windowDays) {
            alerts.push({
              docId: doc.id,
              driverId: doc.driver_id,
              docType: rule.docType, // Use rule's docType for consistency
              expiresAt,
              alertType: 'expiring',
              alertWindowDays: windowDays
            })
            break // Only alert for the largest matching window (most urgent)
          }
        }
      }
    }
    
    return alerts
  })
}

