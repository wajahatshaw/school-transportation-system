-- ============================================================================
-- ADD ROUTE_ID TO STUDENTS TABLE
-- ============================================================================

-- Add route_id column to students table
ALTER TABLE students
ADD COLUMN IF NOT EXISTS route_id UUID REFERENCES routes(id) ON DELETE SET NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_students_route_id ON students(route_id) WHERE deleted_at IS NULL;

-- Update the view to include route_id
DROP VIEW IF EXISTS app.v_students CASCADE;

CREATE VIEW app.v_students
WITH (security_barrier=true)
AS
SELECT 
  id,
  tenant_id,
  first_name,
  last_name,
  grade,
  student_address,
  pickup_address,
  guardian_name,
  guardian_phone,
  school_name,
  school_address,
  school_phone,
  route_id,
  deleted_at,
  deleted_by,
  created_at,
  updated_at
FROM public.students
WHERE tenant_id = app.get_current_tenant_id()
  AND deleted_at IS NULL;

GRANT SELECT ON app.v_students TO PUBLIC;

-- ============================================================================
-- VERIFICATION: Students table updated with route_id
-- ============================================================================
-- 1. Column: route_id (UUID, FK to routes)
-- 2. Index: idx_students_route_id
-- 3. Updated View: app.v_students (includes route_id)
