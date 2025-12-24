-- ============================================================================
-- FIX AUDIT TRIGGER - Use correct function names
-- ============================================================================

-- Drop and recreate audit_trigger function with correct function names
CREATE OR REPLACE FUNCTION audit_trigger()
RETURNS TRIGGER AS $$
BEGIN
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
    app.get_current_tenant_id(),  -- Fixed: was current_tenant_id()
    tg_table_name,
    coalesce(new.id, old.id),
    tg_op,
    to_jsonb(old),
    to_jsonb(new),
    app.get_current_user_id(),  -- Fixed: was current_user_id()
    current_setting('app.current_user_ip', true),
    now()
  );
  
  RETURN new;
END;
$$ LANGUAGE plpgsql;

\echo '✅ Audit trigger fixed to use app.get_current_tenant_id() and app.get_current_user_id()'

