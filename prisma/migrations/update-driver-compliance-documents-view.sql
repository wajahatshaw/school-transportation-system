-- Update view to include new columns: status, uploaded_by, notes
-- Run this after the add-compliance-automation-tables.sql migration

DROP VIEW IF EXISTS app.v_driver_compliance_documents CASCADE;

CREATE VIEW app.v_driver_compliance_documents
WITH (security_barrier=true)
AS
SELECT 
  id,
  tenant_id,
  driver_id,
  doc_type,
  issued_at,
  expires_at,
  file_url,
  status,
  uploaded_by,
  notes,
  deleted_at,
  deleted_by,
  created_at,
  updated_at
FROM public.driver_compliance_documents
WHERE tenant_id = app.get_current_tenant_id()
  AND deleted_at IS NULL;

-- Grant permissions
GRANT SELECT ON app.v_driver_compliance_documents TO PUBLIC;

