-- Migration: Add compliance automation tables and fields
-- Adds compliance_rules, compliance_snapshots, compliance_alerts tables
-- Adds status, uploaded_by, notes fields to driver_compliance_documents

-- Add new fields to driver_compliance_documents
ALTER TABLE driver_compliance_documents
  ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'valid',
  ADD COLUMN IF NOT EXISTS uploaded_by UUID,
  ADD COLUMN IF NOT EXISTS notes TEXT;

-- Create compliance_rules table
CREATE TABLE IF NOT EXISTS compliance_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL DEFAULT 'driver',
  doc_type VARCHAR(255) NOT NULL,
  required BOOLEAN NOT NULL DEFAULT true,
  grace_days INTEGER NOT NULL DEFAULT 0,
  alert_windows_json JSONB,
  created_at TIMESTAMPTZ(6) DEFAULT NOW(),
  updated_at TIMESTAMPTZ(6) DEFAULT NOW(),
  UNIQUE(tenant_id, role, doc_type)
);

-- Create compliance_snapshots table
CREATE TABLE IF NOT EXISTS compliance_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  driver_id UUID,
  compliance_score DECIMAL(5, 2),
  compliant BOOLEAN NOT NULL DEFAULT false,
  expired_count INTEGER NOT NULL DEFAULT 0,
  expiring_count INTEGER NOT NULL DEFAULT 0,
  missing_count INTEGER NOT NULL DEFAULT 0,
  computed_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  details_json JSONB,
  created_at TIMESTAMPTZ(6) DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_compliance_snapshots_tenant_driver_computed 
  ON compliance_snapshots(tenant_id, driver_id, computed_at);

-- Create compliance_alerts table
CREATE TABLE IF NOT EXISTS compliance_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  driver_id UUID NOT NULL,
  doc_id UUID,
  alert_type VARCHAR(50) NOT NULL,
  alert_window_days INTEGER NOT NULL,
  sent_at TIMESTAMPTZ(6),
  channel VARCHAR(50),
  dedupe_key VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ(6) DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_compliance_alerts_tenant_driver_type 
  ON compliance_alerts(tenant_id, driver_id, alert_type);
CREATE INDEX IF NOT EXISTS idx_compliance_alerts_dedupe 
  ON compliance_alerts(dedupe_key);

-- Enable RLS on new tables
ALTER TABLE compliance_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_alerts ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 1: CREATE RLS POLICIES
-- ============================================================================

-- RLS Policies for compliance_rules
DROP POLICY IF EXISTS tenant_isolation_compliance_rules ON compliance_rules;
CREATE POLICY tenant_isolation_compliance_rules ON compliance_rules
  FOR ALL
  USING (
    app.get_current_tenant_id() IS NOT NULL
    AND tenant_id = app.get_current_tenant_id()
  );

-- RLS Policies for compliance_snapshots
DROP POLICY IF EXISTS tenant_isolation_compliance_snapshots ON compliance_snapshots;
CREATE POLICY tenant_isolation_compliance_snapshots ON compliance_snapshots
  FOR ALL
  USING (
    app.get_current_tenant_id() IS NOT NULL
    AND tenant_id = app.get_current_tenant_id()
  );

-- RLS Policies for compliance_alerts
DROP POLICY IF EXISTS tenant_isolation_compliance_alerts ON compliance_alerts;
CREATE POLICY tenant_isolation_compliance_alerts ON compliance_alerts
  FOR ALL
  USING (
    app.get_current_tenant_id() IS NOT NULL
    AND tenant_id = app.get_current_tenant_id()
  );

-- ============================================================================
-- STEP 2: ENSURE app.check_tenant_access FUNCTION EXISTS
-- ============================================================================

-- Create the check_tenant_access function if it doesn't exist
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
-- STEP 3: CREATE TENANT ISOLATION TRIGGER FUNCTIONS
-- ============================================================================

-- Compliance rules table trigger function
CREATE OR REPLACE FUNCTION app.enforce_compliance_rules_tenant_isolation()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM app.check_tenant_access(NEW.tenant_id, 'compliance_rules');
    RETURN NEW;
  END IF;
  
  IF TG_OP = 'UPDATE' THEN
    PERFORM app.check_tenant_access(OLD.tenant_id, 'compliance_rules');
    PERFORM app.check_tenant_access(NEW.tenant_id, 'compliance_rules');
    IF OLD.tenant_id != NEW.tenant_id THEN
      RAISE EXCEPTION 'Cannot change tenant_id of existing record in compliance_rules table';
    END IF;
    RETURN NEW;
  END IF;
  
  IF TG_OP = 'DELETE' THEN
    PERFORM app.check_tenant_access(OLD.tenant_id, 'compliance_rules');
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Compliance snapshots table trigger function
CREATE OR REPLACE FUNCTION app.enforce_compliance_snapshots_tenant_isolation()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM app.check_tenant_access(NEW.tenant_id, 'compliance_snapshots');
    RETURN NEW;
  END IF;
  
  IF TG_OP = 'UPDATE' THEN
    PERFORM app.check_tenant_access(OLD.tenant_id, 'compliance_snapshots');
    PERFORM app.check_tenant_access(NEW.tenant_id, 'compliance_snapshots');
    IF OLD.tenant_id != NEW.tenant_id THEN
      RAISE EXCEPTION 'Cannot change tenant_id of existing record in compliance_snapshots table';
    END IF;
    RETURN NEW;
  END IF;
  
  IF TG_OP = 'DELETE' THEN
    PERFORM app.check_tenant_access(OLD.tenant_id, 'compliance_snapshots');
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Compliance alerts table trigger function
CREATE OR REPLACE FUNCTION app.enforce_compliance_alerts_tenant_isolation()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM app.check_tenant_access(NEW.tenant_id, 'compliance_alerts');
    RETURN NEW;
  END IF;
  
  IF TG_OP = 'UPDATE' THEN
    PERFORM app.check_tenant_access(OLD.tenant_id, 'compliance_alerts');
    PERFORM app.check_tenant_access(NEW.tenant_id, 'compliance_alerts');
    IF OLD.tenant_id != NEW.tenant_id THEN
      RAISE EXCEPTION 'Cannot change tenant_id of existing record in compliance_alerts table';
    END IF;
    RETURN NEW;
  END IF;
  
  IF TG_OP = 'DELETE' THEN
    PERFORM app.check_tenant_access(OLD.tenant_id, 'compliance_alerts');
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- STEP 4: CREATE TENANT ISOLATION TRIGGERS
-- ============================================================================

-- Compliance rules table
DROP TRIGGER IF EXISTS enforce_tenant_isolation_compliance_rules ON compliance_rules;
CREATE TRIGGER enforce_tenant_isolation_compliance_rules
  BEFORE INSERT OR UPDATE OR DELETE
  ON compliance_rules
  FOR EACH ROW
  EXECUTE FUNCTION app.enforce_compliance_rules_tenant_isolation();

-- Compliance snapshots table
DROP TRIGGER IF EXISTS enforce_tenant_isolation_compliance_snapshots ON compliance_snapshots;
CREATE TRIGGER enforce_tenant_isolation_compliance_snapshots
  BEFORE INSERT OR UPDATE OR DELETE
  ON compliance_snapshots
  FOR EACH ROW
  EXECUTE FUNCTION app.enforce_compliance_snapshots_tenant_isolation();

-- Compliance alerts table
DROP TRIGGER IF EXISTS enforce_tenant_isolation_compliance_alerts ON compliance_alerts;
CREATE TRIGGER enforce_tenant_isolation_compliance_alerts
  BEFORE INSERT OR UPDATE OR DELETE
  ON compliance_alerts
  FOR EACH ROW
  EXECUTE FUNCTION app.enforce_compliance_alerts_tenant_isolation();

-- ============================================================================
-- STEP 5: ENSURE audit_trigger FUNCTION EXISTS
-- ============================================================================

-- Create the audit_trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION audit_trigger()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_logs (
    tenant_id,
    table_name,
    record_id,
    action,
    before,
    after,
    user_id,
    ip,
    created_at
  ) VALUES (
    app.get_current_tenant_id(),
    tg_table_name,
    coalesce(new.id, old.id),
    tg_op,
    to_jsonb(old),
    to_jsonb(new),
    app.get_current_user_id(),
    current_setting('app.current_user_ip', true),
    now()
  );
  
  RETURN new;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- STEP 6: CREATE AUDIT TRIGGERS
-- ============================================================================

-- Audit trigger for compliance_rules
DROP TRIGGER IF EXISTS audit_compliance_rules ON compliance_rules;
CREATE TRIGGER audit_compliance_rules
  AFTER INSERT OR UPDATE OR DELETE
  ON compliance_rules
  FOR EACH ROW
  EXECUTE FUNCTION audit_trigger();

-- Audit trigger for compliance_snapshots
DROP TRIGGER IF EXISTS audit_compliance_snapshots ON compliance_snapshots;
CREATE TRIGGER audit_compliance_snapshots
  AFTER INSERT OR UPDATE OR DELETE
  ON compliance_snapshots
  FOR EACH ROW
  EXECUTE FUNCTION audit_trigger();

-- Audit trigger for compliance_alerts
DROP TRIGGER IF EXISTS audit_compliance_alerts ON compliance_alerts;
CREATE TRIGGER audit_compliance_alerts
  AFTER INSERT OR UPDATE OR DELETE
  ON compliance_alerts
  FOR EACH ROW
  EXECUTE FUNCTION audit_trigger();

-- ============================================================================
-- STEP 7: ENSURE app.get_current_tenant_id FUNCTION EXISTS
-- ============================================================================

-- Create the get_current_tenant_id function if it doesn't exist
CREATE OR REPLACE FUNCTION app.get_current_tenant_id()
RETURNS uuid AS $$
DECLARE
  v_tenant_id uuid;
BEGIN
  BEGIN
    v_tenant_id := current_setting('app.current_tenant_id', true)::uuid;
  EXCEPTION WHEN OTHERS THEN
    RETURN NULL;
  END;
  
  RETURN v_tenant_id;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Create the get_current_user_id function if it doesn't exist
CREATE OR REPLACE FUNCTION app.get_current_user_id()
RETURNS uuid AS $$
DECLARE
  v_user_id uuid;
BEGIN
  BEGIN
    v_user_id := current_setting('app.current_user_id', true)::uuid;
  EXCEPTION WHEN OTHERS THEN
    RETURN NULL;
  END;
  
  RETURN v_user_id;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ============================================================================
-- STEP 8: CREATE VIEWS FOR RLS-PROTECTED ACCESS
-- ============================================================================

-- Create views for RLS-protected access
DROP VIEW IF EXISTS app.v_compliance_rules CASCADE;
CREATE VIEW app.v_compliance_rules AS
SELECT 
  id,
  tenant_id,
  role,
  doc_type,
  required,
  grace_days,
  alert_windows_json,
  created_at,
  updated_at
FROM compliance_rules
WHERE tenant_id = app.get_current_tenant_id();

GRANT SELECT ON app.v_compliance_rules TO PUBLIC;

DROP VIEW IF EXISTS app.v_compliance_snapshots CASCADE;
CREATE VIEW app.v_compliance_snapshots AS
SELECT 
  id,
  tenant_id,
  driver_id,
  compliance_score,
  compliant,
  expired_count,
  expiring_count,
  missing_count,
  computed_at,
  details_json,
  created_at
FROM compliance_snapshots
WHERE tenant_id = app.get_current_tenant_id();

GRANT SELECT ON app.v_compliance_snapshots TO PUBLIC;

DROP VIEW IF EXISTS app.v_compliance_alerts CASCADE;
CREATE VIEW app.v_compliance_alerts AS
SELECT 
  id,
  tenant_id,
  driver_id,
  doc_id,
  alert_type,
  alert_window_days,
  sent_at,
  channel,
  dedupe_key,
  created_at
FROM compliance_alerts
WHERE tenant_id = app.get_current_tenant_id();

GRANT SELECT ON app.v_compliance_alerts TO PUBLIC;

-- Seed default compliance rules (common document types)
-- These will be created per tenant when needed via application logic
-- For now, we just create the structure

COMMENT ON TABLE compliance_rules IS 'Defines required compliance documents and alert thresholds per tenant/role';
COMMENT ON TABLE compliance_snapshots IS 'Stores computed compliance status snapshots for reporting';
COMMENT ON TABLE compliance_alerts IS 'Tracks compliance alerts sent to prevent duplicates';

