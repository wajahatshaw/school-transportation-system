-- ============================================================================
-- ADD VEHICLE FIELDS AND CREATE VEHICLE_MAINTENANCE_DOCS TABLE
-- ============================================================================

-- ============================================================================
-- STEP 1: ADD NEW FIELDS TO VEHICLES TABLE
-- ============================================================================

-- Add manufacture_year, model, and vehicle_maintenance_doc_id to vehicles table
ALTER TABLE vehicles 
  ADD COLUMN IF NOT EXISTS manufacture_year INTEGER,
  ADD COLUMN IF NOT EXISTS model VARCHAR(255),
  ADD COLUMN IF NOT EXISTS vehicle_maintenance_doc_id UUID;

-- ============================================================================
-- STEP 2: CREATE VEHICLE_MAINTENANCE_DOCS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS vehicle_maintenance_docs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  maintenance_doc_url TEXT,
  notes TEXT,
  scheduled_date DATE,
  maintenance_status VARCHAR(20) DEFAULT 'pending' CHECK (maintenance_status IN ('pending', 'completed')),
  completed_date DATE,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- STEP 3: ADD FOREIGN KEY CONSTRAINT FOR vehicle_maintenance_doc_id
-- ============================================================================

ALTER TABLE vehicles
  ADD CONSTRAINT fk_vehicles_maintenance_doc 
  FOREIGN KEY (vehicle_maintenance_doc_id) 
  REFERENCES vehicle_maintenance_docs(id) 
  ON DELETE SET NULL;

-- ============================================================================
-- STEP 4: ENABLE RLS ON VEHICLE_MAINTENANCE_DOCS
-- ============================================================================

ALTER TABLE vehicle_maintenance_docs ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 5: CREATE RLS POLICY FOR VEHICLE_MAINTENANCE_DOCS
-- Note: tenant_id is derived from vehicle relationship
-- ============================================================================

DROP POLICY IF EXISTS tenant_isolation_vehicle_maintenance_docs ON vehicle_maintenance_docs;

CREATE POLICY tenant_isolation_vehicle_maintenance_docs ON public.vehicle_maintenance_docs
  FOR ALL
  TO PUBLIC
  USING (
    app.get_current_tenant_id() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.vehicles v
      WHERE v.id = public.vehicle_maintenance_docs.vehicle_id
      AND v.tenant_id = app.get_current_tenant_id()
      AND v.deleted_at IS NULL
    )
    AND public.vehicle_maintenance_docs.deleted_at IS NULL
  )
  WITH CHECK (
    app.get_current_tenant_id() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.vehicles v
      WHERE v.id = public.vehicle_maintenance_docs.vehicle_id
      AND v.tenant_id = app.get_current_tenant_id()
      AND v.deleted_at IS NULL
    )
  );

-- ============================================================================
-- STEP 6: CREATE TENANT ISOLATION TRIGGER FUNCTION FOR VEHICLE_MAINTENANCE_DOCS
-- Note: tenant_id is derived from vehicle relationship
-- ============================================================================

CREATE OR REPLACE FUNCTION app.enforce_vehicle_maintenance_docs_tenant_isolation()
RETURNS TRIGGER AS $$
DECLARE
  v_vehicle_tenant_id UUID;
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Get tenant_id from vehicle
    SELECT tenant_id INTO v_vehicle_tenant_id
    FROM public.vehicles
    WHERE id = NEW.vehicle_id AND deleted_at IS NULL;
    
    IF v_vehicle_tenant_id IS NULL THEN
      RAISE EXCEPTION 'Vehicle not found or deleted for vehicle_maintenance_docs';
    END IF;
    
    PERFORM app.check_tenant_access(v_vehicle_tenant_id, 'vehicle_maintenance_docs');
    RETURN NEW;
  END IF;
  
  IF TG_OP = 'UPDATE' THEN
    -- Check old vehicle tenant
    SELECT tenant_id INTO v_vehicle_tenant_id
    FROM public.vehicles
    WHERE id = OLD.vehicle_id AND deleted_at IS NULL;
    
    IF v_vehicle_tenant_id IS NULL THEN
      RAISE EXCEPTION 'Vehicle not found or deleted for vehicle_maintenance_docs';
    END IF;
    
    PERFORM app.check_tenant_access(v_vehicle_tenant_id, 'vehicle_maintenance_docs');
    
    -- Check new vehicle tenant (if vehicle_id changed)
    IF OLD.vehicle_id != NEW.vehicle_id THEN
      SELECT tenant_id INTO v_vehicle_tenant_id
      FROM public.vehicles
      WHERE id = NEW.vehicle_id AND deleted_at IS NULL;
      
      IF v_vehicle_tenant_id IS NULL THEN
        RAISE EXCEPTION 'Vehicle not found or deleted for vehicle_maintenance_docs';
      END IF;
      
      PERFORM app.check_tenant_access(v_vehicle_tenant_id, 'vehicle_maintenance_docs');
    END IF;
    
    RETURN NEW;
  END IF;
  
  IF TG_OP = 'DELETE' THEN
    -- Get tenant_id from vehicle
    SELECT tenant_id INTO v_vehicle_tenant_id
    FROM public.vehicles
    WHERE id = OLD.vehicle_id AND deleted_at IS NULL;
    
    IF v_vehicle_tenant_id IS NULL THEN
      RAISE EXCEPTION 'Vehicle not found or deleted for vehicle_maintenance_docs';
    END IF;
    
    PERFORM app.check_tenant_access(v_vehicle_tenant_id, 'vehicle_maintenance_docs');
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- STEP 7: CREATE TENANT ISOLATION TRIGGER FOR VEHICLE_MAINTENANCE_DOCS
-- ============================================================================

DROP TRIGGER IF EXISTS enforce_tenant_isolation_vehicle_maintenance_docs ON vehicle_maintenance_docs;

CREATE TRIGGER enforce_tenant_isolation_vehicle_maintenance_docs
  BEFORE INSERT OR UPDATE OR DELETE
  ON vehicle_maintenance_docs
  FOR EACH ROW
  EXECUTE FUNCTION app.enforce_vehicle_maintenance_docs_tenant_isolation();

-- ============================================================================
-- STEP 8: CREATE AUDIT TRIGGER FUNCTION FOR VEHICLE_MAINTENANCE_DOCS
-- Note: Custom function to get tenant_id from vehicle relationship
-- ============================================================================

CREATE OR REPLACE FUNCTION audit_vehicle_maintenance_docs_trigger()
RETURNS TRIGGER AS $$
DECLARE
  v_tenant_id UUID;
BEGIN
  -- Get tenant_id from vehicle
  IF TG_OP = 'DELETE' THEN
    SELECT tenant_id INTO v_tenant_id
    FROM public.vehicles
    WHERE id = OLD.vehicle_id;
  ELSE
    SELECT tenant_id INTO v_tenant_id
    FROM public.vehicles
    WHERE id = NEW.vehicle_id;
  END IF;
  
  -- Insert audit log
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
    v_tenant_id,
    'vehicle_maintenance_docs',
    coalesce(NEW.id, OLD.id),
    TG_OP,
    to_jsonb(OLD),
    to_jsonb(NEW),
    app.get_current_user_id(),
    current_setting('app.current_user_ip', true),
    now()
  );
  
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Create audit trigger
DROP TRIGGER IF EXISTS audit_vehicle_maintenance_docs ON vehicle_maintenance_docs;

CREATE TRIGGER audit_vehicle_maintenance_docs
  AFTER INSERT OR UPDATE OR DELETE
  ON vehicle_maintenance_docs
  FOR EACH ROW
  EXECUTE FUNCTION audit_vehicle_maintenance_docs_trigger();

-- ============================================================================
-- STEP 9: CREATE VIEW FOR VEHICLE_MAINTENANCE_DOCS SELECT OPERATIONS
-- ============================================================================

CREATE OR REPLACE VIEW app.v_vehicle_maintenance_docs
WITH (security_barrier=true)
AS
SELECT 
  vmd.id,
  v.tenant_id,
  vmd.vehicle_id,
  vmd.maintenance_doc_url,
  vmd.notes,
  vmd.scheduled_date,
  vmd.maintenance_status,
  vmd.completed_date,
  vmd.deleted_at,
  vmd.deleted_by,
  vmd.created_at,
  vmd.updated_at
FROM public.vehicle_maintenance_docs vmd
INNER JOIN public.vehicles v ON v.id = vmd.vehicle_id
WHERE v.tenant_id = app.get_current_tenant_id()
  AND v.deleted_at IS NULL
  AND vmd.deleted_at IS NULL;

GRANT SELECT ON app.v_vehicle_maintenance_docs TO PUBLIC;

-- ============================================================================
-- STEP 10: UPDATE VEHICLES VIEW TO INCLUDE NEW FIELDS
-- ============================================================================

DROP VIEW IF EXISTS app.v_vehicles;

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
  manufacture_year,
  model,
  vehicle_maintenance_doc_id,
  deleted_at,
  deleted_by,
  created_at,
  updated_at
FROM public.vehicles
WHERE tenant_id = app.get_current_tenant_id()
  AND deleted_at IS NULL;

GRANT SELECT ON app.v_vehicles TO PUBLIC;

-- ============================================================================
-- VERIFICATION: Summary of changes
-- ============================================================================
-- 1. Added to vehicles table:
--    - manufacture_year (INTEGER)
--    - model (VARCHAR(255))
--    - vehicle_maintenance_doc_id (UUID, FK to vehicle_maintenance_docs)
--
-- 2. Created vehicle_maintenance_docs table with:
--    - All required fields including vehicle_id, maintenance_doc_url,
--      notes, scheduled_date, maintenance_status (VARCHAR: 'pending' or 'completed'), completed_date
--    - Standard fields: deleted_at, deleted_by, created_at, updated_at
--    - Note: tenant_id is derived from vehicle relationship (not stored in table)
--
-- 3. RLS Policy: tenant_isolation_vehicle_maintenance_docs
--
-- 4. Tenant Isolation Trigger: enforce_tenant_isolation_vehicle_maintenance_docs
--
-- 5. Audit Trigger: audit_vehicle_maintenance_docs
--
-- 6. View: app.v_vehicle_maintenance_docs (for SELECT operations)
--
-- 7. Updated View: app.v_vehicles (includes new fields)

