-- ============================================================================
-- ADD manufacture_year AND model COLUMNS TO VEHICLES TABLE
-- ============================================================================

-- Add manufacture_year and model columns to vehicles table
ALTER TABLE vehicles 
  ADD COLUMN IF NOT EXISTS manufacture_year INTEGER,
  ADD COLUMN IF NOT EXISTS model VARCHAR(255);

-- ============================================================================
-- UPDATE VEHICLES VIEW TO INCLUDE NEW FIELDS
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
  deleted_at,
  deleted_by,
  created_at,
  updated_at
FROM public.vehicles
WHERE tenant_id = app.get_current_tenant_id()
  AND deleted_at IS NULL;

GRANT SELECT ON app.v_vehicles TO PUBLIC;

-- ============================================================================
-- VERIFICATION: Columns added successfully
-- ============================================================================
-- 1. Added column: manufacture_year (INTEGER)
-- 2. Added column: model (VARCHAR(255))
-- 3. Updated view: app.v_vehicles (includes new fields)

