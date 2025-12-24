-- ============================================================================
-- ENABLE ROW LEVEL SECURITY ON ALL TENANT-SCOPED TABLES
-- ============================================================================

-- Enable RLS
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_compliance_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- CREATE RLS POLICIES FOR TENANT ISOLATION
-- ============================================================================

-- Students table policy
DROP POLICY IF EXISTS tenant_isolation_students ON students;
CREATE POLICY tenant_isolation_students ON students
  FOR ALL
  USING (
    tenant_id = current_setting('app.current_tenant_id', true)::uuid
    AND deleted_at IS NULL
  )
  WITH CHECK (
    tenant_id = current_setting('app.current_tenant_id', true)::uuid
  );

-- Drivers table policy
DROP POLICY IF EXISTS tenant_isolation_drivers ON drivers;
CREATE POLICY tenant_isolation_drivers ON drivers
  FOR ALL
  USING (
    tenant_id = current_setting('app.current_tenant_id', true)::uuid
    AND deleted_at IS NULL
  )
  WITH CHECK (
    tenant_id = current_setting('app.current_tenant_id', true)::uuid
  );

-- Driver compliance documents policy
DROP POLICY IF EXISTS tenant_isolation_driver_compliance ON driver_compliance_documents;
CREATE POLICY tenant_isolation_driver_compliance ON driver_compliance_documents
  FOR ALL
  USING (
    tenant_id = current_setting('app.current_tenant_id', true)::uuid
    AND deleted_at IS NULL
  )
  WITH CHECK (
    tenant_id = current_setting('app.current_tenant_id', true)::uuid
  );

-- Audit logs policy
DROP POLICY IF EXISTS tenant_isolation_audit_logs ON audit_logs;
CREATE POLICY tenant_isolation_audit_logs ON audit_logs
  FOR ALL
  USING (
    tenant_id = current_setting('app.current_tenant_id', true)::uuid
  )
  WITH CHECK (
    tenant_id = current_setting('app.current_tenant_id', true)::uuid
  );

-- Memberships policy - users can only see their own memberships
DROP POLICY IF EXISTS user_isolation_memberships ON memberships;
CREATE POLICY user_isolation_memberships ON memberships
  FOR ALL
  USING (
    user_id = current_setting('app.current_user_id', true)::uuid
  )
  WITH CHECK (
    user_id = current_setting('app.current_user_id', true)::uuid
  );

-- ============================================================================
-- VERIFY POLICIES ARE CREATED
-- ============================================================================

SELECT 
    tablename,
    policyname,
    cmd as command,
    CASE 
        WHEN qual IS NOT NULL THEN 'USING: ' || qual::text
        ELSE 'No USING clause'
    END as policy_definition
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('students', 'drivers', 'driver_compliance_documents', 'audit_logs', 'memberships')
ORDER BY tablename, policyname;

