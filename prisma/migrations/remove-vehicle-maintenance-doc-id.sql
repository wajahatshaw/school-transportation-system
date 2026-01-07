-- ============================================================================
-- REMOVE vehicle_maintenance_doc_id FROM VEHICLES TABLE
-- The relationship is already established via vehicle_id in vehicle_maintenance_docs table
-- ============================================================================

-- ============================================================================
-- STEP 1: DROP VIEW FIRST (it depends on the column)
-- ============================================================================

DROP VIEW IF EXISTS app.v_vehicles;

-- ============================================================================
-- STEP 2: DROP FOREIGN KEY CONSTRAINT
-- ============================================================================

ALTER TABLE vehicles
  DROP CONSTRAINT IF EXISTS fk_vehicles_maintenance_doc;

-- ============================================================================
-- STEP 3: DROP COLUMN vehicle_maintenance_doc_id
-- ============================================================================

ALTER TABLE vehicles
  DROP COLUMN IF EXISTS vehicle_maintenance_doc_id;

-- ============================================================================
-- STEP 4: RECREATE VEHICLES VIEW WITHOUT vehicle_maintenance_doc_id
-- ============================================================================

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
  deleted_at,
  deleted_by,
  created_at,
  updated_at
FROM public.vehicles
WHERE tenant_id = app.get_current_tenant_id()
  AND deleted_at IS NULL;

GRANT SELECT ON app.v_vehicles TO PUBLIC;

-- ============================================================================
-- VERIFICATION: Changes completed
-- ============================================================================
-- 1. Dropped view: app.v_vehicles (to remove dependency)
-- 2. Dropped foreign key constraint: fk_vehicles_maintenance_doc
-- 3. Dropped column: vehicle_maintenance_doc_id from vehicles table
-- 4. Recreated view: app.v_vehicles (without vehicle_maintenance_doc_id field)

