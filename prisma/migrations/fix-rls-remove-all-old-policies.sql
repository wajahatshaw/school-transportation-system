-- ============================================================================
-- REMOVE ALL EXISTING RLS POLICIES AND RECREATE THEM CORRECTLY
-- This migration removes ALL policies (including old ones) and recreates only the correct ones
-- ============================================================================

-- ============================================================================
-- STEP 1: DROP ALL EXISTING POLICIES (Complete Clean Slate)
-- ============================================================================

-- Drop ALL policies from students table
DROP POLICY IF EXISTS tenant_isolation_students ON students;
DROP POLICY IF EXISTS students_rls ON students;
DROP POLICY IF EXISTS students_insert_policy ON students;
DROP POLICY IF EXISTS students_select_policy ON students;
DROP POLICY IF EXISTS students_update_policy ON students;
DROP POLICY IF EXISTS students_tenant_isolation ON students;

-- Drop ALL policies from drivers table
DROP POLICY IF EXISTS tenant_isolation_drivers ON drivers;
DROP POLICY IF EXISTS drivers_insert_policy ON drivers;
DROP POLICY IF EXISTS drivers_select_policy ON drivers;
DROP POLICY IF EXISTS drivers_update_policy ON drivers;
DROP POLICY IF EXISTS drivers_tenant_isolation ON drivers;

-- Drop ALL policies from driver_compliance_documents table
DROP POLICY IF EXISTS tenant_isolation_compliance ON driver_compliance_documents;
DROP POLICY IF EXISTS tenant_isolation_driver_compliance ON driver_compliance_documents;
DROP POLICY IF EXISTS driver_docs_insert_policy ON driver_compliance_documents;
DROP POLICY IF EXISTS driver_docs_select_policy ON driver_compliance_documents;
DROP POLICY IF EXISTS driver_docs_update_policy ON driver_compliance_documents;
DROP POLICY IF EXISTS compliance_insert_policy ON driver_compliance_documents;
DROP POLICY IF EXISTS compliance_select_policy ON driver_compliance_documents;
DROP POLICY IF EXISTS compliance_update_policy ON driver_compliance_documents;
DROP POLICY IF EXISTS compliance_tenant_isolation ON driver_compliance_documents;

-- Drop ALL policies from audit_logs table
DROP POLICY IF EXISTS tenant_isolation_audit_logs ON audit_logs;
DROP POLICY IF EXISTS audit_logs_tenant_isolation ON audit_logs;
DROP POLICY IF EXISTS "tenant read audit logs" ON audit_logs;

-- Drop ALL policies from memberships table
DROP POLICY IF EXISTS user_isolation_memberships ON memberships;
DROP POLICY IF EXISTS memberships_select_own ON memberships;
DROP POLICY IF EXISTS memberships_self_read ON memberships;
DROP POLICY IF EXISTS memberships_tenant_isolation ON memberships;

-- Drop ALL policies from tenants table
DROP POLICY IF EXISTS tenant_access_via_membership ON tenants;
DROP POLICY IF EXISTS tenant_visibility ON tenants;

-- ============================================================================
-- STEP 2: VERIFY ALL POLICIES ARE DROPPED
-- ============================================================================

\echo ''
\echo '✅ Verifying all policies are dropped...'
\echo ''

SELECT 
    tablename,
    COUNT(*) as remaining_policies
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('students', 'drivers', 'driver_compliance_documents', 'audit_logs', 'memberships', 'tenants')
GROUP BY tablename
ORDER BY tablename;

\echo ''
\echo 'Expected: 0 policies remaining for each table'
\echo ''

-- ============================================================================
-- STEP 3: ENSURE RLS IS ENABLED
-- ============================================================================

ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_compliance_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 4: ENSURE HELPER FUNCTIONS EXIST
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS app;

CREATE OR REPLACE FUNCTION app.get_current_tenant_id()
RETURNS uuid AS $$
BEGIN
  BEGIN
    RETURN current_setting('app.current_tenant_id', true)::uuid;
  EXCEPTION WHEN OTHERS THEN
    -- If variable is not set or invalid, return NULL
    -- This will cause RLS policies to deny access
    RETURN NULL;
  END;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION app.get_current_user_id()
RETURNS uuid AS $$
BEGIN
  BEGIN
    RETURN current_setting('app.current_user_id', true)::uuid;
  EXCEPTION WHEN OTHERS THEN
    -- If variable is not set or invalid, return NULL
    RETURN NULL;
  END;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ============================================================================
-- STEP 5: CREATE ONLY THE CORRECT RLS POLICIES
-- ============================================================================

-- Students: Only allow access when tenant_id matches AND row is not deleted
CREATE POLICY tenant_isolation_students ON students
  FOR ALL
  USING (
    tenant_id = app.get_current_tenant_id()
    AND deleted_at IS NULL
  )
  WITH CHECK (
    tenant_id = app.get_current_tenant_id()
  );

-- Drivers: Only allow access when tenant_id matches AND row is not deleted
CREATE POLICY tenant_isolation_drivers ON drivers
  FOR ALL
  USING (
    app.get_current_tenant_id() IS NOT NULL
    AND tenant_id = app.get_current_tenant_id()
    AND deleted_at IS NULL
  )
  WITH CHECK (
    app.get_current_tenant_id() IS NOT NULL
    AND tenant_id = app.get_current_tenant_id()
  );

-- Driver compliance documents: Only allow access when tenant_id matches AND row is not deleted
CREATE POLICY tenant_isolation_compliance ON driver_compliance_documents
  FOR ALL
  USING (
    app.get_current_tenant_id() IS NOT NULL
    AND tenant_id = app.get_current_tenant_id()
    AND deleted_at IS NULL
  )
  WITH CHECK (
    app.get_current_tenant_id() IS NOT NULL
    AND tenant_id = app.get_current_tenant_id()
  );

-- Audit logs: Only allow access when tenant_id matches (no deleted_at check needed)
CREATE POLICY tenant_isolation_audit_logs ON audit_logs
  FOR ALL
  USING (
    app.get_current_tenant_id() IS NOT NULL
    AND tenant_id = app.get_current_tenant_id()
  )
  WITH CHECK (
    app.get_current_tenant_id() IS NOT NULL
    AND tenant_id = app.get_current_tenant_id()
  );

-- Memberships: Users can only see their own memberships
CREATE POLICY user_isolation_memberships ON memberships
  FOR ALL
  USING (
    app.get_current_user_id() IS NOT NULL
    AND user_id = app.get_current_user_id()
  )
  WITH CHECK (
    app.get_current_user_id() IS NOT NULL
    AND user_id = app.get_current_user_id()
  );

-- Tenants: Users can only see tenants they have membership in
CREATE POLICY tenant_access_via_membership ON tenants
  FOR SELECT
  USING (
    app.get_current_user_id() IS NOT NULL
    AND id IN (
      SELECT tenant_id 
      FROM memberships 
      WHERE user_id = app.get_current_user_id()
    )
  );

-- ============================================================================
-- STEP 6: VERIFY NEW POLICIES
-- ============================================================================

\echo ''
\echo '✅ NEW POLICIES CREATED:'
\echo ''

SELECT 
    tablename,
    policyname,
    cmd as command
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('students', 'drivers', 'driver_compliance_documents', 'audit_logs', 'memberships', 'tenants')
ORDER BY tablename, policyname;

\echo ''
\echo 'Expected: Exactly 1 policy per table (except memberships and tenants which may have 1-2)'
\echo ''
\echo '✅ RLS FIX COMPLETE - All old policies removed!'
\echo ''

