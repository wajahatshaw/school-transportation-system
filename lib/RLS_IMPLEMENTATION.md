# Row Level Security (RLS) Implementation Guide

This document explains how database-enforced tenant isolation is implemented using Postgres Row Level Security (RLS) and session variables.

## Architecture Overview

### Key Principles

1. **Database-Enforced Security**: All tenant isolation is enforced at the database level via RLS policies, not in application code.

2. **Session Variables**: Postgres session variables (`app.current_tenant_id`, `app.current_user_id`, `app.current_user_ip`) are set at the start of each transaction.

3. **No Application-Level Filtering**: Prisma queries do NOT include `where: { tenantId }` clauses. RLS automatically filters results.

4. **Trigger-Based Audit Logging**: All audit logs are created by database triggers, not application code.

## How It Works

### 1. Transaction Flow

Every database operation follows this pattern:

```typescript
// 1. Get tenant context from auth session
const context = await getTenantContext()

// 2. Execute query in transaction with session variables
return await withTenantContext(context, async (tx) => {
  // Session variables are set here automatically
  // RLS policies enforce tenant isolation
  
  // Query without tenantId filter
  return await tx.student.findMany({
    where: { isDeleted: false }
    // No tenantId needed - RLS handles it
  })
})
```

### 2. Session Variable Setting

The `withTenantContext` helper:
1. Starts a Prisma transaction
2. Sets Postgres session variables:
   - `SET LOCAL app.current_tenant_id = '...'`
   - `SET LOCAL app.current_user_id = '...'`
   - `SET LOCAL app.current_user_ip = '...'`
3. Executes the callback with the transaction client
4. All queries in the callback are automatically scoped by RLS

### 3. RLS Policies (Database Side)

The database must have RLS policies like:

```sql
-- Enable RLS on all tenant-scoped tables
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_compliance_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Example policy for students table
CREATE POLICY tenant_isolation_students ON students
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

-- Similar policies for other tables...
```

### 4. Database Triggers

The database must have triggers that:
1. Set `tenant_id` on INSERT based on `app.current_tenant_id`
2. Create audit log entries on INSERT/UPDATE/DELETE
3. Capture `user_id` and `ip` from session variables

## Implementation Details

### `lib/withTenantContext.ts`

Core helper that:
- Validates UUID and IP formats
- Sets Postgres session variables in a transaction
- Provides type-safe transaction client to callbacks

### `lib/actions.ts`

All server actions:
- Use `withTenantContext` for every database operation
- Do NOT filter by `tenantId` in Prisma queries
- Do NOT manually create audit logs
- Rely entirely on RLS and triggers

### `lib/getTenantContext()`

Currently a placeholder that:
- Gets the first tenant (for demo)
- Returns a demo user ID and IP

**In Production**, replace with:
```typescript
export async function getTenantContext(request: Request): Promise<TenantContext> {
  const session = await getSession(request)
  
  return {
    tenantId: session.tenantId,
    userId: session.userId,
    ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0] 
      || request.headers.get('x-real-ip') 
      || 'unknown'
  }
}
```

## Example Usage

### Creating a Student

```typescript
export async function createStudent(data: { firstName: string; lastName: string }) {
  const context = await getTenantContext()
  
  return await withTenantContext(context, async (tx) => {
    // No tenantId in data - trigger sets it from session variable
    const student = await tx.student.create({
      data: {
        firstName: data.firstName,
        lastName: data.lastName
      }
    })
    
    // Audit log created automatically by trigger
    // No manual logAudit() call needed
    
    return student
  })
}
```

### Reading Students

```typescript
export async function getStudents() {
  const context = await getTenantContext()
  
  return await withTenantContext(context, async (tx) => {
    // RLS automatically filters by tenant_id
    // No where: { tenantId } needed
    return await tx.student.findMany({
      where: { isDeleted: false }
    })
  })
}
```

### Reading Audit Logs

```typescript
export async function getAuditLogs() {
  const context = await getTenantContext()
  
  return await withTenantContext(context, async (tx) => {
    // RLS ensures we only see our tenant's audit logs
    return await tx.auditLog.findMany({
      orderBy: { createdAt: 'desc' }
    })
  })
}
```

## Security Benefits

1. **Cannot Bypass**: Even if application code is modified, RLS policies still enforce isolation.

2. **Audit Trail**: All changes are logged by database triggers, ensuring complete audit coverage.

3. **Performance**: RLS policies are evaluated at the database level, which is efficient.

4. **Compliance**: Meets requirements for compliance-focused applications where data isolation must be database-enforced.

## Testing

To test RLS enforcement:

1. Set up two different tenants
2. Create data for each tenant
3. Verify that queries from one tenant cannot see the other tenant's data
4. Verify that attempting to access another tenant's data returns empty results or errors

## Migration Checklist

When deploying to production:

- [ ] Replace `getTenantContext()` with real auth extraction
- [ ] Ensure RLS policies are enabled on all tenant-scoped tables
- [ ] Verify database triggers are in place
- [ ] Test with multiple tenants to verify isolation
- [ ] Verify audit logs are being created by triggers
- [ ] Remove any remaining `where: { tenantId }` clauses from queries
- [ ] Remove any manual `logAudit()` calls

