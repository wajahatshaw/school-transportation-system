-- ============================================================================
-- COMPREHENSIVE RLS FIX FOR TENANT ISOLATION
-- This migration fixes RLS policies to properly enforce tenant isolation
-- ============================================================================

-- ============================================================================
-- STEP 1: DROP ALL EXISTING POLICIES (Clean Slate)
-- ============================================================================

-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS tenant_isolation_students ON students;
DROP POLICY IF EXISTS tenant_isolation_drivers ON drivers;
DROP POLICY IF EXISTS tenant_isolation_driver_compliance ON driver_compliance_documents;
DROP POLICY IF EXISTS tenant_isolation_compliance ON driver_compliance_documents;
DROP POLICY IF EXISTS tenant_isolation_audit_logs ON audit_logs;
DROP POLICY IF EXISTS user_isolation_memberships ON memberships;
DROP POLICY IF EXISTS tenant_access_via_membership ON tenants;

-- Drop any old policies that might exist
DROP POLICY IF EXISTS audit_logs_tenant_isolation ON audit_logs;
DROP POLICY IF EXISTS "tenant read audit logs" ON audit_logs;
DROP POLICY IF EXISTS compliance_insert_policy ON driver_compliance_documents;
DROP POLICY IF EXISTS compliance_select_policy ON driver_compliance_documents;
DROP POLICY IF EXISTS compliance_tenant_isolation ON driver_compliance_documents;
DROP POLICY IF EXISTS compliance_update_policy ON driver_compliance_documents;
DROP POLICY IF EXISTS drivers_insert_policy ON drivers;
DROP POLICY IF EXISTS drivers_select_policy ON drivers;
DROP POLICY IF EXISTS drivers_tenant_isolation ON drivers;
DROP POLICY IF EXISTS drivers_update_policy ON drivers;
DROP POLICY IF EXISTS memberships_select_own ON memberships;
DROP POLICY IF EXISTS memberships_tenant_isolation ON memberships;
DROP POLICY IF EXISTS students_insert_policy ON students;
DROP POLICY IF EXISTS students_select_policy ON students;
DROP POLICY IF EXISTS students_tenant_isolation ON students;
DROP POLICY IF EXISTS students_update_policy ON students;

-- ============================================================================
-- STEP 2: ENSURE RLS IS ENABLED ON ALL TENANT-SCOPED TABLES
-- ============================================================================

ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_compliance_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 3: CREATE APP SCHEMA (if it doesn't exist)
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS app;

-- ============================================================================
-- STEP 4: CREATE HELPER FUNCTION FOR SAFE SESSION VARIABLE READING
-- This function safely reads session variables and returns NULL if not set
-- ============================================================================

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
-- STEP 5: CREATE RLS POLICIES WITH PROPER TENANT ISOLATION
-- These policies use the helper functions to safely check session variables
-- ============================================================================

-- Students table: Only allow access to rows where tenant_id matches session variable
-- AND the row is not soft-deleted
CREATE POLICY tenant_isolation_students ON students
  FOR ALL
  USING (
    tenant_id = app.get_current_tenant_id()
    AND deleted_at IS NULL
  )
  WITH CHECK (
    tenant_id = app.get_current_tenant_id()
  );

-- Drivers table: Only allow access to rows where tenant_id matches session variable
-- AND the row is not soft-deleted
CREATE POLICY tenant_isolation_drivers ON drivers
  FOR ALL
  USING (
    tenant_id = app.get_current_tenant_id()
    AND deleted_at IS NULL
  )
  WITH CHECK (
    tenant_id = app.get_current_tenant_id()
  );

-- Driver compliance documents: Only allow access to rows where tenant_id matches
-- AND the row is not soft-deleted
CREATE POLICY tenant_isolation_compliance ON driver_compliance_documents
  FOR ALL
  USING (
    tenant_id = app.get_current_tenant_id()
    AND deleted_at IS NULL
  )
  WITH CHECK (
    tenant_id = app.get_current_tenant_id()
  );

-- Audit logs: Only allow access to rows where tenant_id matches session variable
-- (No deleted_at check since audit logs are never soft-deleted)
CREATE POLICY tenant_isolation_audit_logs ON audit_logs
  FOR ALL
  USING (
    tenant_id = app.get_current_tenant_id()
  )
  WITH CHECK (
    tenant_id = app.get_current_tenant_id()
  );

-- Memberships: Users can only see their own memberships
-- This is critical for tenant discovery
CREATE POLICY user_isolation_memberships ON memberships
  FOR ALL
  USING (
    user_id = app.get_current_user_id()
  )
  WITH CHECK (
    user_id = app.get_current_user_id()
  );

-- Tenants: Users can only see tenants they have membership in
-- This prevents users from seeing tenant IDs they don't belong to
CREATE POLICY tenant_access_via_membership ON tenants
  FOR SELECT
  USING (
    id IN (
      SELECT tenant_id 
      FROM memberships 
      WHERE user_id = app.get_current_user_id()
    )
  );

-- ============================================================================
-- STEP 6: VERIFY POLICIES ARE CREATED CORRECTLY
-- ============================================================================

\echo ''
\echo '✅ RLS POLICIES CREATED:'
\echo ''

SELECT 
    tablename,
    policyname,
    cmd as command,
    CASE 
        WHEN qual IS NOT NULL THEN substring(qual::text, 1, 100) || '...'
        ELSE 'No USING clause'
    END as policy_definition
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('students', 'drivers', 'driver_compliance_documents', 'audit_logs', 'memberships', 'tenants')
ORDER BY tablename, policyname;

\echo ''
\echo '✅ RLS STATUS:'
\echo ''

SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('students', 'drivers', 'driver_compliance_documents', 'audit_logs', 'memberships', 'tenants')
ORDER BY tablename;

\echo ''
\echo '✅ HELPER FUNCTIONS CREATED:'
\echo ''

SELECT 
    routine_name,
    routine_type
FROM information_schema.routines
WHERE routine_schema = 'app'
AND routine_name IN ('get_current_tenant_id', 'get_current_user_id')
ORDER BY routine_name;

\echo ''
\echo '✅ RLS FIX COMPLETE!'
\echo ''
\echo 'IMPORTANT: Test tenant isolation by:'
\echo '  1. Setting session variables for tenant A'
\echo '  2. Verifying you can only see tenant A data'
\echo '  3. Setting session variables for tenant B'
\echo '  4. Verifying you can only see tenant B data'
\echo ''

