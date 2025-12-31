-- Migration: Add email + auth_user_id to drivers, and expose them via app.v_drivers
-- Run this in Supabase SQL editor or via psql against your DATABASE_URL.

-- 1) Add columns (nullable to avoid breaking existing rows)
ALTER TABLE public.drivers
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS auth_user_id UUID;

COMMENT ON COLUMN public.drivers.email IS 'Driver login email (matches Supabase Auth user email)';
COMMENT ON COLUMN public.drivers.auth_user_id IS 'Supabase Auth user id (auth.users.id) for this driver';

-- 2) Helpful indexes (non-breaking)
CREATE INDEX IF NOT EXISTS idx_drivers_tenant_email ON public.drivers(tenant_id, email);
CREATE INDEX IF NOT EXISTS idx_drivers_auth_user_id ON public.drivers(auth_user_id);

-- 3) Optional uniqueness (uncomment if you want strict enforcement)
-- NOTE: Multi-tenant safe uniqueness usually means unique per tenant.
-- ALTER TABLE public.drivers
--   ADD CONSTRAINT drivers_unique_tenant_email UNIQUE (tenant_id, email);
-- ALTER TABLE public.drivers
--   ADD CONSTRAINT drivers_unique_auth_user_id UNIQUE (auth_user_id);

-- Recommended uniqueness: prevent multiple ACTIVE (non-deleted) drivers with the same email per tenant
CREATE UNIQUE INDEX IF NOT EXISTS uniq_drivers_tenant_email_active
ON public.drivers(tenant_id, email)
WHERE deleted_at IS NULL AND email IS NOT NULL;

-- 4) RLS / tenant isolation compatibility
-- Adding columns does not change existing RLS policies, but we ensure RLS is enabled.
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;

-- 5) Audit log compatibility
-- Your audit trigger function stores `to_jsonb(old)` and `to_jsonb(new)`,
-- so it will automatically include these new columns.
-- Ensure the audit trigger is present on the drivers table.
DROP TRIGGER IF EXISTS audit_drivers ON public.drivers;
CREATE TRIGGER audit_drivers
  AFTER INSERT OR UPDATE OR DELETE
  ON public.drivers
  FOR EACH ROW
  EXECUTE FUNCTION audit_trigger();

-- 6) Update the tenant-isolated SELECT view so the app can read these fields
CREATE OR REPLACE VIEW app.v_drivers
WITH (security_barrier=true)
AS
SELECT 
  id,
  tenant_id,
  first_name,
  last_name,
  license_number,
  deleted_at,
  deleted_by,
  created_at,
  updated_at,
  -- IMPORTANT: When using CREATE OR REPLACE VIEW, Postgres does not allow
  -- changing the names/order of existing view columns. To add new columns,
  -- append them at the end.
  email,
  auth_user_id
FROM public.drivers
WHERE tenant_id = app.get_current_tenant_id()
  AND deleted_at IS NULL;

GRANT SELECT ON app.v_drivers TO PUBLIC;


