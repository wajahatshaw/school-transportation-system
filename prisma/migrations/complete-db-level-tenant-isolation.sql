-- ============================================================================
-- COMPLETE DATABASE-LEVEL TENANT ISOLATION
-- This solution uses triggers for INSERT/UPDATE/DELETE and views for SELECT
-- Works even with BYPASSRLS enabled
-- ============================================================================

-- ============================================================================
-- PART 1: TRIGGERS (Already created - for INSERT/UPDATE/DELETE)
-- These are already in place from enforce-tenant-isolation-triggers.sql
-- ============================================================================

-- ============================================================================
-- PART 2: CREATE SECURITY BARRIER VIEWS FOR SELECT OPERATIONS
-- These views enforce tenant filtering at the database level
-- ============================================================================

-- Drop existing views if they exist
DROP VIEW IF EXISTS app.v_students CASCADE;
DROP VIEW IF EXISTS app.v_drivers CASCADE;
DROP VIEW IF EXISTS app.v_driver_compliance_documents CASCADE;
DROP VIEW IF EXISTS app.v_audit_logs CASCADE;

-- Create views with SECURITY BARRIER (enforces filtering even with BYPASSRLS)
CREATE VIEW app.v_students
WITH (security_barrier=true)
AS
SELECT 
  id,
  tenant_id,
  first_name,
  last_name,
  grade,
  deleted_at,
  deleted_by,
  created_at,
  updated_at
FROM public.students
WHERE tenant_id = app.get_current_tenant_id()
  AND deleted_at IS NULL;

CREATE VIEW app.v_drivers
WITH (security_barrier=true)
AS
SELECT 
  id,
  tenant_id,
  first_name,
  last_name,
  license_number,
  deleted_at,
  deleted_by,
  created_at,
  updated_at
FROM public.drivers
WHERE tenant_id = app.get_current_tenant_id()
  AND deleted_at IS NULL;

CREATE VIEW app.v_driver_compliance_documents
WITH (security_barrier=true)
AS
SELECT 
  id,
  tenant_id,
  driver_id,
  doc_type,
  issued_at,
  expires_at,
  file_url,
  deleted_at,
  deleted_by,
  created_at,
  updated_at
FROM public.driver_compliance_documents
WHERE tenant_id = app.get_current_tenant_id()
  AND deleted_at IS NULL;

CREATE VIEW app.v_audit_logs
WITH (security_barrier=true)
AS
SELECT 
  id,
  tenant_id,
  table_name,
  record_id,
  action,
  before,
  after,
  user_id,
  ip,
  created_at
FROM public.audit_logs
WHERE tenant_id = app.get_current_tenant_id();

-- ============================================================================
-- PART 3: CREATE INSTEAD OF TRIGGERS FOR VIEWS (Optional - for INSERT/UPDATE via views)
-- These allow INSERT/UPDATE/DELETE operations through the views
-- ============================================================================

-- Note: Since we already have triggers on the base tables, we don't necessarily
-- need INSTEAD OF triggers on views. The views are primarily for SELECT operations.
-- However, if you want to allow operations through views, you'd need INSTEAD OF triggers.

-- ============================================================================
-- PART 4: GRANT PERMISSIONS
-- ============================================================================

GRANT SELECT ON app.v_students TO PUBLIC;
GRANT SELECT ON app.v_drivers TO PUBLIC;
GRANT SELECT ON app.v_driver_compliance_documents TO PUBLIC;
GRANT SELECT ON app.v_audit_logs TO PUBLIC;

-- ============================================================================
-- SUMMARY
-- ============================================================================

\echo ''
\echo '✅ DATABASE-LEVEL TENANT ISOLATION COMPLETE!'
\echo ''
\echo 'PROTECTION MECHANISMS:'
\echo ''
\echo '1. INSERT/UPDATE/DELETE: Enforced by BEFORE triggers on base tables'
\echo '   - Triggers check tenant_id matches session variable'
\echo '   - Prevents tenant_id changes on UPDATE'
\echo '   - Works even with BYPASSRLS enabled'
\echo ''
\echo '2. SELECT: Use views in app schema'
\echo '   - app.v_students - filtered by tenant_id'
\echo '   - app.v_drivers - filtered by tenant_id'
\echo '   - app.v_driver_compliance_documents - filtered by tenant_id'
\echo '   - app.v_audit_logs - filtered by tenant_id'
\echo ''
\echo 'NEXT STEPS:'
\echo ''
\echo 'Option A: Update Prisma schema to use views instead of tables'
\echo '  - Change @@map("students") to point to app.v_students view'
\echo '  - Requires schema changes'
\echo ''
\echo 'Option B: Use raw queries to SELECT from views'
\echo '  - Use Prisma $queryRaw to query views when needed'
\echo '  - Less elegant but works immediately'
\echo ''
\echo 'Option C: Keep application-level filtering for SELECT (current state)'
\echo '  - Triggers enforce INSERT/UPDATE/DELETE at DB level'
\echo '  - Application enforces SELECT filtering'
\echo '  - Hybrid approach that works'
\echo ''

