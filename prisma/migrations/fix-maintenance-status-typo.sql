-- ============================================================================
-- FIX TYPO: Rename maintainance_status to maintenance_status
-- ============================================================================

-- ============================================================================
-- STEP 1: DROP VIEW FIRST (it depends on the column)
-- ============================================================================

DROP VIEW IF EXISTS app.v_vehicle_maintenance_docs;

-- ============================================================================
-- STEP 2: RENAME COLUMN
-- ============================================================================

ALTER TABLE vehicle_maintenance_docs
  RENAME COLUMN maintainance_status TO maintenance_status;

-- ============================================================================
-- STEP 3: RECREATE VIEW WITH CORRECT COLUMN NAME
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
-- VERIFICATION: Column renamed successfully
-- ============================================================================
-- 1. Dropped view: app.v_vehicle_maintenance_docs
-- 2. Renamed column: maintainance_status -> maintenance_status
-- 3. Recreated view: app.v_vehicle_maintenance_docs (with correct column name)

