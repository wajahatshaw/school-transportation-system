-- ============================================================================
-- DROP ALL EXISTING POLICIES (Clean Slate)
-- ============================================================================

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
DROP POLICY IF EXISTS tenant_isolation_students ON students;
DROP POLICY IF EXISTS tenant_isolation_drivers ON drivers;
DROP POLICY IF EXISTS tenant_isolation_driver_compliance ON driver_compliance_documents;
DROP POLICY IF EXISTS tenant_isolation_audit_logs ON audit_logs;
DROP POLICY IF EXISTS user_isolation_memberships ON memberships;

-- Drop any function that might exist
DROP FUNCTION IF EXISTS current_tenant_id() CASCADE;

-- ============================================================================
-- CREATE NEW POLICIES - USING SESSION VARIABLES DIRECTLY
-- ============================================================================

-- Students table policy
CREATE POLICY tenant_isolation_students ON students
  FOR ALL
  USING (
    tenant_id = (current_setting('app.current_tenant_id', true))::uuid
    AND deleted_at IS NULL
  )
  WITH CHECK (
    tenant_id = (current_setting('app.current_tenant_id', true))::uuid
  );

-- Drivers table policy  
CREATE POLICY tenant_isolation_drivers ON drivers
  FOR ALL
  USING (
    tenant_id = (current_setting('app.current_tenant_id', true))::uuid
    AND deleted_at IS NULL
  )
  WITH CHECK (
    tenant_id = (current_setting('app.current_tenant_id', true))::uuid
  );

-- Driver compliance documents policy
CREATE POLICY tenant_isolation_compliance ON driver_compliance_documents
  FOR ALL
  USING (
    tenant_id = (current_setting('app.current_tenant_id', true))::uuid
    AND deleted_at IS NULL
  )
  WITH CHECK (
    tenant_id = (current_setting('app.current_tenant_id', true))::uuid
  );

-- Audit logs policy
CREATE POLICY tenant_isolation_audit_logs ON audit_logs
  FOR ALL
  USING (
    tenant_id = (current_setting('app.current_tenant_id', true))::uuid
  )
  WITH CHECK (
    tenant_id = (current_setting('app.current_tenant_id', true))::uuid
  );

-- Memberships policy - users can only see their own memberships
CREATE POLICY user_isolation_memberships ON memberships
  FOR ALL
  USING (
    user_id = (current_setting('app.current_user_id', true))::uuid
  )
  WITH CHECK (
    user_id = (current_setting('app.current_user_id', true))::uuid
  );

-- Tenants - users can only see tenants they have membership in
CREATE POLICY tenant_access_via_membership ON tenants
  FOR SELECT
  USING (
    id IN (
      SELECT tenant_id 
      FROM memberships 
      WHERE user_id = (current_setting('app.current_user_id', true))::uuid
    )
  );

-- ============================================================================
-- VERIFY NEW POLICIES
-- ============================================================================

\echo ''
\echo '✅ POLICIES CREATED:'
\echo ''

SELECT 
    tablename,
    policyname,
    cmd as command
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

\echo ''
\echo '✅ SETUP COMPLETE!'
\echo ''

