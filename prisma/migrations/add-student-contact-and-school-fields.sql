-- ============================================================================
-- ADD STUDENT CONTACT + SCHOOL FIELDS (Supabase / Postgres)
-- Safe: columns are nullable, RLS policies unchanged, audit trigger captures new columns via to_jsonb(old/new)
-- ============================================================================

ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS student_address  text,
  ADD COLUMN IF NOT EXISTS pickup_address   text,
  ADD COLUMN IF NOT EXISTS guardian_name    text,
  ADD COLUMN IF NOT EXISTS guardian_phone   text,
  ADD COLUMN IF NOT EXISTS school_name      text,
  ADD COLUMN IF NOT EXISTS school_address   text,
  ADD COLUMN IF NOT EXISTS school_phone     text;

-- Keep the tenant-isolated SELECT view in sync (used by app.v_students)
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


