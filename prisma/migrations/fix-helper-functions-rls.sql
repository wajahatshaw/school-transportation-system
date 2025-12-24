-- ============================================================================
-- FIX HELPER FUNCTIONS TO WORK CORRECTLY WITH RLS
-- Remove SECURITY DEFINER to ensure RLS policies evaluate correctly
-- ============================================================================

-- Drop and recreate helper functions without SECURITY DEFINER
DROP FUNCTION IF EXISTS app.get_current_tenant_id() CASCADE;
DROP FUNCTION IF EXISTS app.get_current_user_id() CASCADE;

-- Recreate without SECURITY DEFINER - they should run with caller's privileges
CREATE OR REPLACE FUNCTION app.get_current_tenant_id()
RETURNS uuid AS $$
BEGIN
  BEGIN
    RETURN current_setting('app.current_tenant_id', true)::uuid;
  EXCEPTION WHEN OTHERS THEN
    -- If variable is not set or invalid, return NULL
    -- This will cause RLS policies to deny access
    RETURN NULL;
  END;
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION app.get_current_user_id()
RETURNS uuid AS $$
BEGIN
  BEGIN
    RETURN current_setting('app.current_user_id', true)::uuid;
  EXCEPTION WHEN OTHERS THEN
    -- If variable is not set or invalid, return NULL
    RETURN NULL;
  END;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- VERIFY FUNCTIONS
-- ============================================================================

\echo ''
\echo '✅ Helper functions recreated:'
\echo ''

SELECT 
    proname,
    prosecdef as security_definer,
    proowner::regrole as owner
FROM pg_proc 
WHERE pronamespace = 'app'::regnamespace 
AND proname LIKE 'get_current%'
ORDER BY proname;

\echo ''
\echo 'Expected: security_definer = false (or f)'
\echo ''

