-- ============================================================================
-- DATABASE-LEVEL TENANT ISOLATION USING TRIGGERS
-- This enforces tenant isolation at the database level even when BYPASSRLS is enabled
-- ============================================================================

-- ============================================================================
-- STEP 1: CREATE FUNCTION TO CHECK TENANT ACCESS
-- ============================================================================

CREATE OR REPLACE FUNCTION app.check_tenant_access(p_table_tenant_id uuid, p_table_name text)
RETURNS boolean AS $$
DECLARE
  v_current_tenant_id uuid;
BEGIN
  -- Get current tenant ID from session variable
  BEGIN
    v_current_tenant_id := current_setting('app.current_tenant_id', true)::uuid;
  EXCEPTION WHEN OTHERS THEN
    -- If not set, deny access
    RAISE EXCEPTION 'Tenant context not set. Cannot access % without tenant context.', p_table_name;
  END;
  
  -- If session variable is NULL, deny access
  IF v_current_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Tenant context not set. Cannot access % without tenant context.', p_table_name;
  END IF;
  
  -- Check if tenant IDs match
  IF p_table_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Record in % has no tenant_id. Access denied.', p_table_name;
  END IF;
  
  IF p_table_tenant_id != v_current_tenant_id THEN
    RAISE EXCEPTION 'Access denied. Tenant ID mismatch for table %.', p_table_name;
  END IF;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- STEP 2: CREATE TRIGGER FUNCTIONS FOR EACH TABLE
-- ============================================================================

-- Students table trigger
CREATE OR REPLACE FUNCTION app.enforce_students_tenant_isolation()
RETURNS TRIGGER AS $$
BEGIN
  -- For INSERT: tenant_id should already be set from application, but verify it matches session
  IF TG_OP = 'INSERT' THEN
    PERFORM app.check_tenant_access(NEW.tenant_id, 'students');
    RETURN NEW;
  END IF;
  
  -- For UPDATE: check both OLD and NEW tenant_id match session
  IF TG_OP = 'UPDATE' THEN
    PERFORM app.check_tenant_access(OLD.tenant_id, 'students');
    PERFORM app.check_tenant_access(NEW.tenant_id, 'students');
    -- Prevent tenant_id changes
    IF OLD.tenant_id != NEW.tenant_id THEN
      RAISE EXCEPTION 'Cannot change tenant_id of existing record in students table';
    END IF;
    RETURN NEW;
  END IF;
  
  -- For DELETE: check tenant_id matches session
  IF TG_OP = 'DELETE' THEN
    PERFORM app.check_tenant_access(OLD.tenant_id, 'students');
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Drivers table trigger
CREATE OR REPLACE FUNCTION app.enforce_drivers_tenant_isolation()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM app.check_tenant_access(NEW.tenant_id, 'drivers');
    RETURN NEW;
  END IF;
  
  IF TG_OP = 'UPDATE' THEN
    PERFORM app.check_tenant_access(OLD.tenant_id, 'drivers');
    PERFORM app.check_tenant_access(NEW.tenant_id, 'drivers');
    IF OLD.tenant_id != NEW.tenant_id THEN
      RAISE EXCEPTION 'Cannot change tenant_id of existing record in drivers table';
    END IF;
    RETURN NEW;
  END IF;
  
  IF TG_OP = 'DELETE' THEN
    PERFORM app.check_tenant_access(OLD.tenant_id, 'drivers');
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Driver compliance documents trigger
CREATE OR REPLACE FUNCTION app.enforce_compliance_tenant_isolation()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM app.check_tenant_access(NEW.tenant_id, 'driver_compliance_documents');
    RETURN NEW;
  END IF;
  
  IF TG_OP = 'UPDATE' THEN
    PERFORM app.check_tenant_access(OLD.tenant_id, 'driver_compliance_documents');
    PERFORM app.check_tenant_access(NEW.tenant_id, 'driver_compliance_documents');
    IF OLD.tenant_id != NEW.tenant_id THEN
      RAISE EXCEPTION 'Cannot change tenant_id of existing record in driver_compliance_documents table';
    END IF;
    RETURN NEW;
  END IF;
  
  IF TG_OP = 'DELETE' THEN
    PERFORM app.check_tenant_access(OLD.tenant_id, 'driver_compliance_documents');
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Audit logs trigger (read-only, but enforce on insert)
CREATE OR REPLACE FUNCTION app.enforce_audit_logs_tenant_isolation()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM app.check_tenant_access(NEW.tenant_id, 'audit_logs');
    RETURN NEW;
  END IF;
  
  -- Audit logs should not be updated or deleted
  IF TG_OP IN ('UPDATE', 'DELETE') THEN
    RAISE EXCEPTION 'Audit logs cannot be modified or deleted';
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- STEP 3: DROP EXISTING TRIGGERS IF THEY EXIST
-- ============================================================================

DROP TRIGGER IF EXISTS enforce_tenant_isolation_students ON students;
DROP TRIGGER IF EXISTS enforce_tenant_isolation_drivers ON drivers;
DROP TRIGGER IF EXISTS enforce_tenant_isolation_compliance ON driver_compliance_documents;
DROP TRIGGER IF EXISTS enforce_tenant_isolation_audit_logs ON audit_logs;

-- ============================================================================
-- STEP 4: CREATE TRIGGERS
-- ============================================================================

-- Students table: BEFORE trigger for INSERT/UPDATE/DELETE
CREATE TRIGGER enforce_tenant_isolation_students
  BEFORE INSERT OR UPDATE OR DELETE
  ON students
  FOR EACH ROW
  EXECUTE FUNCTION app.enforce_students_tenant_isolation();

-- Drivers table
CREATE TRIGGER enforce_tenant_isolation_drivers
  BEFORE INSERT OR UPDATE OR DELETE
  ON drivers
  FOR EACH ROW
  EXECUTE FUNCTION app.enforce_drivers_tenant_isolation();

-- Driver compliance documents table
CREATE TRIGGER enforce_tenant_isolation_compliance
  BEFORE INSERT OR UPDATE OR DELETE
  ON driver_compliance_documents
  FOR EACH ROW
  EXECUTE FUNCTION app.enforce_compliance_tenant_isolation();

-- Audit logs table
CREATE TRIGGER enforce_tenant_isolation_audit_logs
  BEFORE INSERT OR UPDATE OR DELETE
  ON audit_logs
  FOR EACH ROW
  EXECUTE FUNCTION app.enforce_audit_logs_tenant_isolation();

-- ============================================================================
-- STEP 5: CREATE FUNCTION TO FILTER ROWS BASED ON TENANT (for SELECT)
-- ============================================================================

-- Create a security definer function that can be used in views or called before queries
-- This function checks tenant access and raises an error if access is denied
CREATE OR REPLACE FUNCTION app.verify_tenant_context()
RETURNS uuid AS $$
DECLARE
  v_tenant_id uuid;
BEGIN
  BEGIN
    v_tenant_id := current_setting('app.current_tenant_id', true)::uuid;
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'Tenant context not set. Session variable app.current_tenant_id is required.';
  END;
  
  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Tenant context not set. Session variable app.current_tenant_id is required.';
  END IF;
  
  RETURN v_tenant_id;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ============================================================================
-- STEP 6: CREATE SECURITY DEFINER FUNCTION TO VALIDATE TENANT FOR SELECTS
-- This function can be used to wrap SELECT queries and enforce tenant filtering
-- ============================================================================

CREATE OR REPLACE FUNCTION app.filter_by_tenant(p_query text, p_table_name text)
RETURNS SETOF record AS $$
DECLARE
  v_tenant_id uuid;
  v_result record;
BEGIN
  -- Get and verify tenant context
  v_tenant_id := app.verify_tenant_context();
  
  -- Execute query with tenant filter added
  -- Note: This is a simplified example - in practice, you'd need to parse and modify the query
  -- For now, we rely on triggers for INSERT/UPDATE/DELETE and application filtering for SELECT
  -- with the verification that tenant context is set
  
  RETURN;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- STEP 7: VERIFY TRIGGERS
-- ============================================================================

\echo ''
\echo '✅ TRIGGERS CREATED:'
\echo ''

SELECT 
    trigger_schema,
    trigger_name,
    event_object_table,
    action_timing,
    event_manipulation
FROM information_schema.triggers
WHERE trigger_schema = 'public'
AND trigger_name LIKE 'enforce_tenant_isolation%'
ORDER BY event_object_table, trigger_name;

\echo ''
\echo '✅ DATABASE-LEVEL TENANT ISOLATION TRIGGERS INSTALLED!'
\echo ''
\echo 'These triggers will:'
\echo '  - Enforce tenant_id matches session variable on INSERT/UPDATE/DELETE'
\echo '  - Prevent tenant_id changes on UPDATE'
\echo '  - Raise errors if tenant context is not set'
\echo '  - Work even with BYPASSRLS enabled'
\echo ''

