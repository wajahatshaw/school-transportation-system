-- ============================================================================
-- FIX RLS POLICIES WITH EXPLICIT ROLES AND PROPER USING/WITH CHECK CLAUSES
-- Based on Supabase best practices for RLS policies
-- ============================================================================

-- ============================================================================
-- STEP 1: DROP ALL EXISTING POLICIES
-- ============================================================================

DROP POLICY IF EXISTS tenant_isolation_students ON students;
DROP POLICY IF EXISTS tenant_isolation_drivers ON drivers;
DROP POLICY IF EXISTS tenant_isolation_compliance ON driver_compliance_documents;
DROP POLICY IF EXISTS tenant_isolation_audit_logs ON audit_logs;
DROP POLICY IF EXISTS user_isolation_memberships ON memberships;
DROP POLICY IF EXISTS tenant_access_via_membership ON tenants;

-- ============================================================================
-- STEP 2: CREATE POLICIES WITH EXPLICIT ROLE (PUBLIC = all users)
-- AND PROPER USING/WITH CHECK CLAUSES
-- ============================================================================

-- Students table: Full CRUD policy with explicit schema hints
CREATE POLICY tenant_isolation_students ON public.students
  FOR ALL
  TO PUBLIC
  USING (
    app.get_current_tenant_id() IS NOT NULL
    AND public.students.tenant_id = app.get_current_tenant_id()
    AND public.students.deleted_at IS NULL
  )
  WITH CHECK (
    app.get_current_tenant_id() IS NOT NULL
    AND public.students.tenant_id = app.get_current_tenant_id()
  );

-- Drivers table: Full CRUD policy
CREATE POLICY tenant_isolation_drivers ON public.drivers
  FOR ALL
  TO PUBLIC
  USING (
    app.get_current_tenant_id() IS NOT NULL
    AND public.drivers.tenant_id = app.get_current_tenant_id()
    AND public.drivers.deleted_at IS NULL
  )
  WITH CHECK (
    app.get_current_tenant_id() IS NOT NULL
    AND public.drivers.tenant_id = app.get_current_tenant_id()
  );

-- Driver compliance documents: Full CRUD policy
CREATE POLICY tenant_isolation_compliance ON public.driver_compliance_documents
  FOR ALL
  TO PUBLIC
  USING (
    app.get_current_tenant_id() IS NOT NULL
    AND public.driver_compliance_documents.tenant_id = app.get_current_tenant_id()
    AND public.driver_compliance_documents.deleted_at IS NULL
  )
  WITH CHECK (
    app.get_current_tenant_id() IS NOT NULL
    AND public.driver_compliance_documents.tenant_id = app.get_current_tenant_id()
  );

-- Audit logs: Full CRUD policy (no deleted_at check needed)
CREATE POLICY tenant_isolation_audit_logs ON public.audit_logs
  FOR ALL
  TO PUBLIC
  USING (
    app.get_current_tenant_id() IS NOT NULL
    AND public.audit_logs.tenant_id = app.get_current_tenant_id()
  )
  WITH CHECK (
    app.get_current_tenant_id() IS NOT NULL
    AND public.audit_logs.tenant_id = app.get_current_tenant_id()
  );

-- Memberships: Users can only see their own memberships
CREATE POLICY user_isolation_memberships ON public.memberships
  FOR ALL
  TO PUBLIC
  USING (
    app.get_current_user_id() IS NOT NULL
    AND public.memberships.user_id = app.get_current_user_id()
  )
  WITH CHECK (
    app.get_current_user_id() IS NOT NULL
    AND public.memberships.user_id = app.get_current_user_id()
  );

-- Tenants: Users can only see tenants they have membership in (SELECT only)
CREATE POLICY tenant_access_via_membership ON public.tenants
  FOR SELECT
  TO PUBLIC
  USING (
    app.get_current_user_id() IS NOT NULL
    AND public.tenants.id IN (
      SELECT public.memberships.tenant_id 
      FROM public.memberships 
      WHERE public.memberships.user_id = app.get_current_user_id()
    )
  );

-- ============================================================================
-- STEP 3: VERIFY POLICIES
-- ============================================================================

\echo ''
\echo '✅ NEW POLICIES CREATED:'
\echo ''

SELECT 
    schemaname,
    tablename,
    policyname,
    cmd as command,
    roles
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('students', 'drivers', 'driver_compliance_documents', 'audit_logs', 'memberships', 'tenants')
ORDER BY tablename, policyname;

\echo ''
\echo '✅ RLS POLICIES FIXED WITH EXPLICIT ROLES!'
\echo ''

