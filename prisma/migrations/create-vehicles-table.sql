-- ============================================================================
-- CREATE VEHICLES TABLE WITH RLS AND AUDIT TRIGGERS
-- ============================================================================

-- Create vehicles table
CREATE TABLE IF NOT EXISTS vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  capacity INTEGER NOT NULL CHECK (capacity > 0),
  license_plate VARCHAR(50),
  vehicle_type VARCHAR(50),
  deleted_at TIMESTAMPTZ,
  deleted_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;

-- Create RLS policy
CREATE POLICY tenant_isolation_vehicles ON vehicles
  FOR ALL
  USING (
    tenant_id = current_setting('app.current_tenant_id', true)::uuid
    AND deleted_at IS NULL
  )
  WITH CHECK (
    tenant_id = current_setting('app.current_tenant_id', true)::uuid
  );

-- Create tenant isolation trigger function
CREATE OR REPLACE FUNCTION app.enforce_vehicles_tenant_isolation()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM app.check_tenant_access(NEW.tenant_id, 'vehicles');
    RETURN NEW;
  END IF;
  
  IF TG_OP = 'UPDATE' THEN
    PERFORM app.check_tenant_access(OLD.tenant_id, 'vehicles');
    PERFORM app.check_tenant_access(NEW.tenant_id, 'vehicles');
    IF OLD.tenant_id != NEW.tenant_id THEN
      RAISE EXCEPTION 'Cannot change tenant_id of existing record in vehicles table';
    END IF;
    RETURN NEW;
  END IF;
  
  IF TG_OP = 'DELETE' THEN
    PERFORM app.check_tenant_access(OLD.tenant_id, 'vehicles');
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create tenant isolation trigger
CREATE TRIGGER enforce_tenant_isolation_vehicles
  BEFORE INSERT OR UPDATE OR DELETE
  ON vehicles
  FOR EACH ROW
  EXECUTE FUNCTION app.enforce_vehicles_tenant_isolation();

-- Create audit trigger
CREATE TRIGGER audit_vehicles
  AFTER INSERT OR UPDATE OR DELETE
  ON vehicles
  FOR EACH ROW
  EXECUTE FUNCTION audit_trigger();

-- Create view for SELECT operations
CREATE VIEW app.v_vehicles
WITH (security_barrier=true)
AS
SELECT 
  id,
  tenant_id,
  name,
  capacity,
  license_plate,
  vehicle_type,
  deleted_at,
  deleted_by,
  created_at,
  updated_at
FROM public.vehicles
WHERE tenant_id = app.get_current_tenant_id()
  AND deleted_at IS NULL;

GRANT SELECT ON app.v_vehicles TO PUBLIC;

-- ============================================================================
-- VERIFICATION: Vehicles table created with:
-- ============================================================================
-- 1. RLS Policy: tenant_isolation_vehicles
-- 2. Tenant Isolation Trigger: enforce_tenant_isolation_vehicles
-- 3. Audit Trigger: audit_vehicles
-- 4. View: app.v_vehicles

