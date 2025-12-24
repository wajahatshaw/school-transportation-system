# Database-Level Tenant Isolation Implementation

This document explains how tenant isolation is enforced at the database level using triggers and views.

## Architecture Overview

### Key Principles

1. **Database-Enforced Security**: All tenant isolation is enforced at the database level, not in application code.

2. **Session Variables**: Postgres session variables (`app.current_tenant_id`, `app.current_user_id`, `app.current_user_ip`) are set at the start of each transaction.

3. **Triggers for Writes**: Database triggers enforce tenant isolation for INSERT/UPDATE/DELETE operations.

4. **Views for Reads**: Database views filter results by tenant for SELECT operations.

5. **Trigger-Based Audit Logging**: All audit logs are created by database triggers automatically.

## How It Works

### 1. Transaction Flow

Every database operation follows this pattern:

```typescript
// 1. Get tenant context from auth session
const context = await getTenantContext()

// 2. Execute query in transaction with session variables
return await withTenantContext(context, async (tx) => {
  // Session variables are set here automatically
  // Triggers enforce tenant isolation for writes
  // Views enforce tenant isolation for reads
  
  // For SELECT: Use views (app.v_students, app.v_drivers, etc.)
  // For INSERT/UPDATE/DELETE: Use base tables (triggers protect them)
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
4. All operations are automatically scoped by triggers/views

### 3. Database Triggers (Write Protection)

Triggers enforce tenant isolation for INSERT/UPDATE/DELETE:

```sql
CREATE TRIGGER enforce_tenant_isolation_students
  BEFORE INSERT OR UPDATE OR DELETE
  ON students
  FOR EACH ROW
  EXECUTE FUNCTION app.enforce_students_tenant_isolation();
```

These triggers:
- Validate that `tenant_id` matches the session variable
- Prevent changing `tenant_id` on UPDATE
- Raise errors if tenant access is denied

### 4. Database Views (Read Protection)

Views filter results by tenant for SELECT operations:

```sql
CREATE VIEW app.v_students AS
SELECT * FROM public.students
WHERE tenant_id = app.get_current_tenant_id()
  AND deleted_at IS NULL;
```

Views automatically filter by tenant using the session variable.

### 5. Audit Triggers

Audit triggers automatically log all changes:

```sql
CREATE TRIGGER audit_students
  AFTER INSERT OR UPDATE OR DELETE
  ON students
  FOR EACH ROW
  EXECUTE FUNCTION audit_trigger();
```

## Implementation Details

### `lib/withTenantContext.ts`

Core helper that:
- Validates UUID and IP formats
- Sets Postgres session variables in a transaction
- Verifies session variables are set correctly
- Provides type-safe transaction client to callbacks

### `lib/actions.ts`

All server actions:
- Use `withTenantContext` for every database operation
- Use views (`app.v_*`) for SELECT operations
- Use base tables for INSERT/UPDATE/DELETE (triggers protect them)
- Do NOT manually create audit logs (triggers handle this)

### SELECT Operations

All SELECT queries use views:

```typescript
const students = await tx.$queryRaw`
  SELECT * FROM app.v_students
  ORDER BY created_at DESC
`
```

Available views:
- `app.v_students`
- `app.v_drivers`
- `app.v_driver_compliance_documents`
- `app.v_audit_logs`

### INSERT/UPDATE/DELETE Operations

All write operations use base tables (triggers protect them):

```typescript
const student = await tx.student.create({
  data: {
    tenantId: context.tenantId,  // Must match session variable
    firstName: data.firstName,
    lastName: data.lastName
  }
})
```

Triggers automatically:
- Validate tenant_id matches session variable
- Create audit log entries
- Prevent tenant_id changes on UPDATE

## Security Benefits

1. **Cannot Bypass**: Even if application code is modified, triggers and views still enforce isolation.

2. **Database-Level**: All enforcement happens at the database level, not in application code.

3. **Audit Trail**: All changes are logged by database triggers automatically.

4. **Compliance**: Meets requirements for compliance-focused applications where data isolation must be database-enforced.

## Migration Files

Essential migration files:
- `enforce-tenant-isolation-triggers.sql` - Creates triggers for write protection
- `complete-db-level-tenant-isolation.sql` - Creates views for read protection
- `fix-audit-trigger.sql` - Fixes audit trigger to use correct function names
- `fix-helper-functions-rls.sql` - Creates helper functions for reading session variables
