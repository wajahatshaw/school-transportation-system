-- Migration: Add optional driver_id to memberships and link it to drivers
-- Run this in Supabase SQL editor or via psql against your DATABASE_URL.

ALTER TABLE public.memberships
  ADD COLUMN IF NOT EXISTS driver_id uuid;

-- Optional FK: when a driver is removed, keep membership but clear driver_id
ALTER TABLE public.memberships
  ADD CONSTRAINT IF NOT EXISTS memberships_driver_id_fkey
  FOREIGN KEY (driver_id)
  REFERENCES public.drivers(id)
  ON DELETE SET NULL;

-- Enforce uniqueness only for non-null driver_id (allows many NULLs)
CREATE UNIQUE INDEX IF NOT EXISTS memberships_driver_id_unique
ON public.memberships(driver_id)
WHERE driver_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_memberships_driver_id
ON public.memberships(driver_id);

COMMENT ON COLUMN public.memberships.driver_id IS 'Optional link to drivers.id for driver memberships';


