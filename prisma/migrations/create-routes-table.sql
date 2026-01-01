-- ============================================================================
-- CREATE ROUTES TABLE WITH RLS AND AUDIT TRIGGERS
-- ============================================================================

-- Create routes table
CREATE TABLE IF NOT EXISTS routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(2) NOT NULL CHECK (type IN ('AM', 'PM')),
  vehicle_id UUID REFERENCES vehicles(id) ON DELETE SET NULL,
  driver_id UUID REFERENCES drivers(id) ON DELETE SET NULL,
  stops JSONB DEFAULT '[]'::jsonb,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_routes_tenant_id ON routes(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_routes_vehicle_id ON routes(vehicle_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_routes_driver_id ON routes(driver_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_routes_type ON routes(type) WHERE deleted_at IS NULL;

-- Enable RLS
ALTER TABLE routes ENABLE ROW LEVEL SECURITY;

-- Create RLS policy
CREATE POLICY tenant_isolation_routes ON routes
  FOR ALL
  USING (
    tenant_id = current_setting('app.current_tenant_id', true)::uuid
    AND deleted_at IS NULL
  )
  WITH CHECK (
    tenant_id = current_setting('app.current_tenant_id', true)::uuid
  );

-- Create tenant isolation trigger function
CREATE OR REPLACE FUNCTION app.enforce_routes_tenant_isolation()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM app.check_tenant_access(NEW.tenant_id, 'routes');
    RETURN NEW;
  END IF;
  
  IF TG_OP = 'UPDATE' THEN
    PERFORM app.check_tenant_access(OLD.tenant_id, 'routes');
    PERFORM app.check_tenant_access(NEW.tenant_id, 'routes');
    IF OLD.tenant_id != NEW.tenant_id THEN
      RAISE EXCEPTION 'Cannot change tenant_id of existing record in routes table';
    END IF;
    RETURN NEW;
  END IF;
  
  IF TG_OP = 'DELETE' THEN
    PERFORM app.check_tenant_access(OLD.tenant_id, 'routes');
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create tenant isolation trigger
CREATE TRIGGER enforce_tenant_isolation_routes
  BEFORE INSERT OR UPDATE OR DELETE
  ON routes
  FOR EACH ROW
  EXECUTE FUNCTION app.enforce_routes_tenant_isolation();

-- Create audit trigger
CREATE TRIGGER audit_routes
  AFTER INSERT OR UPDATE OR DELETE
  ON routes
  FOR EACH ROW
  EXECUTE FUNCTION audit_trigger();

-- Create view for SELECT operations
CREATE VIEW app.v_routes
WITH (security_barrier=true)
AS
SELECT 
  id,
  tenant_id,
  name,
  type,
  vehicle_id,
  driver_id,
  stops,
  deleted_at,
  deleted_by,
  created_at,
  updated_at
FROM public.routes
WHERE tenant_id = app.get_current_tenant_id()
  AND deleted_at IS NULL;

GRANT SELECT ON app.v_routes TO PUBLIC;

-- ============================================================================
-- VERIFICATION: Routes table created with:
-- ============================================================================
-- 1. RLS Policy: tenant_isolation_routes
-- 2. Tenant Isolation Trigger: enforce_tenant_isolation_routes
-- 3. Audit Trigger: audit_routes
-- 4. View: app.v_routes

