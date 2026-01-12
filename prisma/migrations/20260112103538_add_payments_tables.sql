-- ============================================================================
-- ADD PAYMENTS TABLES
-- Creates invoices, invoice_line_items, and payments tables with RLS
-- ============================================================================

-- ============================================================================
-- PART 1: CREATE TABLES
-- ============================================================================

-- Invoices table
CREATE TABLE IF NOT EXISTS invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  invoice_number text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled')),
  issue_date date NOT NULL,
  due_date date NOT NULL,
  subtotal decimal(10, 2) NOT NULL,
  tax decimal(10, 2) DEFAULT 0,
  total decimal(10, 2) NOT NULL,
  paid_amount decimal(10, 2) DEFAULT 0,
  outstanding_amount decimal(10, 2) NOT NULL,
  notes text,
  created_by uuid NOT NULL,
  created_at timestamptz(6) DEFAULT now(),
  updated_at timestamptz(6) DEFAULT now()
);

-- Invoice line items table
CREATE TABLE IF NOT EXISTS invoice_line_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  item_type text NOT NULL CHECK (item_type IN ('route', 'student', 'route-day')),
  route_id uuid REFERENCES routes(id) ON DELETE SET NULL,
  student_id uuid REFERENCES students(id) ON DELETE SET NULL,
  description text NOT NULL,
  quantity decimal(10, 2) NOT NULL,
  unit_price decimal(10, 2) NOT NULL,
  total decimal(10, 2) NOT NULL,
  created_at timestamptz(6) DEFAULT now()
);

-- Payments table
CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  invoice_id uuid NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  amount decimal(10, 2) NOT NULL,
  payment_date date NOT NULL,
  payment_method text NOT NULL CHECK (payment_method IN ('cash', 'check', 'bank_transfer', 'credit_card', 'other')),
  reference_number text,
  notes text,
  recorded_by uuid NOT NULL,
  created_at timestamptz(6) DEFAULT now(),
  updated_at timestamptz(6) DEFAULT now()
);

-- ============================================================================
-- PART 2: CREATE INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_invoices_tenant_status ON invoices(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_invoices_tenant_issue_date ON invoices(tenant_id, issue_date);
CREATE INDEX IF NOT EXISTS idx_invoices_tenant_due_date ON invoices(tenant_id, due_date);
CREATE INDEX IF NOT EXISTS idx_invoice_line_items_invoice_id ON invoice_line_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_line_items_tenant_id ON invoice_line_items(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payments_invoice_id ON payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_tenant_payment_date ON payments(tenant_id, payment_date);

-- ============================================================================
-- PART 3: GRANT PERMISSIONS ON VIEWS
-- ============================================================================

-- Grant SELECT permissions on views (will be created in next section)
-- These grants will be applied after views are created

-- ============================================================================
-- PART 4: CREATE RLS VIEWS FOR SELECT OPERATIONS
-- ============================================================================

-- Drop existing views if they exist
DROP VIEW IF EXISTS app.v_invoices CASCADE;
DROP VIEW IF EXISTS app.v_invoice_line_items CASCADE;
DROP VIEW IF EXISTS app.v_payments CASCADE;

-- Create views with SECURITY BARRIER
CREATE VIEW app.v_invoices
WITH (security_barrier=true)
AS
SELECT 
  id,
  tenant_id,
  invoice_number,
  status,
  issue_date,
  due_date,
  subtotal,
  tax,
  total,
  paid_amount,
  outstanding_amount,
  notes,
  created_by,
  created_at,
  updated_at
FROM public.invoices
WHERE tenant_id = app.get_current_tenant_id();

CREATE VIEW app.v_invoice_line_items
WITH (security_barrier=true)
AS
SELECT 
  id,
  invoice_id,
  tenant_id,
  item_type,
  route_id,
  student_id,
  description,
  quantity,
  unit_price,
  total,
  created_at
FROM public.invoice_line_items
WHERE tenant_id = app.get_current_tenant_id();

CREATE VIEW app.v_payments
WITH (security_barrier=true)
AS
SELECT 
  id,
  tenant_id,
  invoice_id,
  amount,
  payment_date,
  payment_method,
  reference_number,
  notes,
  recorded_by,
  created_at,
  updated_at
FROM public.payments
WHERE tenant_id = app.get_current_tenant_id();

-- Grant SELECT permissions on views
GRANT SELECT ON app.v_invoices TO PUBLIC;
GRANT SELECT ON app.v_invoice_line_items TO PUBLIC;
GRANT SELECT ON app.v_payments TO PUBLIC;

-- ============================================================================
-- PART 5: CREATE TENANT ISOLATION TRIGGERS
-- ============================================================================

-- Invoices table trigger function
CREATE OR REPLACE FUNCTION app.enforce_invoices_tenant_isolation()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM app.check_tenant_access(NEW.tenant_id, 'invoices');
    RETURN NEW;
  END IF;
  
  IF TG_OP = 'UPDATE' THEN
    PERFORM app.check_tenant_access(OLD.tenant_id, 'invoices');
    PERFORM app.check_tenant_access(NEW.tenant_id, 'invoices');
    IF OLD.tenant_id != NEW.tenant_id THEN
      RAISE EXCEPTION 'Cannot change tenant_id of existing record in invoices table';
    END IF;
    RETURN NEW;
  END IF;
  
  IF TG_OP = 'DELETE' THEN
    PERFORM app.check_tenant_access(OLD.tenant_id, 'invoices');
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Invoice line items table trigger function
CREATE OR REPLACE FUNCTION app.enforce_invoice_line_items_tenant_isolation()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM app.check_tenant_access(NEW.tenant_id, 'invoice_line_items');
    RETURN NEW;
  END IF;
  
  IF TG_OP = 'UPDATE' THEN
    PERFORM app.check_tenant_access(OLD.tenant_id, 'invoice_line_items');
    PERFORM app.check_tenant_access(NEW.tenant_id, 'invoice_line_items');
    IF OLD.tenant_id != NEW.tenant_id THEN
      RAISE EXCEPTION 'Cannot change tenant_id of existing record in invoice_line_items table';
    END IF;
    RETURN NEW;
  END IF;
  
  IF TG_OP = 'DELETE' THEN
    PERFORM app.check_tenant_access(OLD.tenant_id, 'invoice_line_items');
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Payments table trigger function
CREATE OR REPLACE FUNCTION app.enforce_payments_tenant_isolation()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM app.check_tenant_access(NEW.tenant_id, 'payments');
    RETURN NEW;
  END IF;
  
  IF TG_OP = 'UPDATE' THEN
    PERFORM app.check_tenant_access(OLD.tenant_id, 'payments');
    PERFORM app.check_tenant_access(NEW.tenant_id, 'payments');
    IF OLD.tenant_id != NEW.tenant_id THEN
      RAISE EXCEPTION 'Cannot change tenant_id of existing record in payments table';
    END IF;
    RETURN NEW;
  END IF;
  
  IF TG_OP = 'DELETE' THEN
    PERFORM app.check_tenant_access(OLD.tenant_id, 'payments');
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
DROP TRIGGER IF EXISTS enforce_tenant_isolation_invoices ON invoices;
CREATE TRIGGER enforce_tenant_isolation_invoices
  BEFORE INSERT OR UPDATE OR DELETE
  ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION app.enforce_invoices_tenant_isolation();

DROP TRIGGER IF EXISTS enforce_tenant_isolation_invoice_line_items ON invoice_line_items;
CREATE TRIGGER enforce_tenant_isolation_invoice_line_items
  BEFORE INSERT OR UPDATE OR DELETE
  ON invoice_line_items
  FOR EACH ROW
  EXECUTE FUNCTION app.enforce_invoice_line_items_tenant_isolation();

DROP TRIGGER IF EXISTS enforce_tenant_isolation_payments ON payments;
CREATE TRIGGER enforce_tenant_isolation_payments
  BEFORE INSERT OR UPDATE OR DELETE
  ON payments
  FOR EACH ROW
  EXECUTE FUNCTION app.enforce_payments_tenant_isolation();

-- ============================================================================
-- PART 5: ENABLE ROW LEVEL SECURITY AND CREATE RLS POLICIES
-- ============================================================================

-- Enable RLS on all new tables
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for invoices
DROP POLICY IF EXISTS tenant_isolation_invoices ON invoices;
CREATE POLICY tenant_isolation_invoices ON invoices
  FOR ALL
  USING (
    tenant_id = current_setting('app.current_tenant_id', true)::uuid
  )
  WITH CHECK (
    tenant_id = current_setting('app.current_tenant_id', true)::uuid
  );

-- Create RLS policies for invoice_line_items
DROP POLICY IF EXISTS tenant_isolation_invoice_line_items ON invoice_line_items;
CREATE POLICY tenant_isolation_invoice_line_items ON invoice_line_items
  FOR ALL
  USING (
    tenant_id = current_setting('app.current_tenant_id', true)::uuid
  )
  WITH CHECK (
    tenant_id = current_setting('app.current_tenant_id', true)::uuid
  );

-- Create RLS policies for payments
DROP POLICY IF EXISTS tenant_isolation_payments ON payments;
CREATE POLICY tenant_isolation_payments ON payments
  FOR ALL
  USING (
    tenant_id = current_setting('app.current_tenant_id', true)::uuid
  )
  WITH CHECK (
    tenant_id = current_setting('app.current_tenant_id', true)::uuid
  );

-- ============================================================================
-- PART 6: CREATE AUDIT TRIGGERS
-- ============================================================================

-- Create audit triggers for all three tables
DROP TRIGGER IF EXISTS audit_invoices ON invoices;
CREATE TRIGGER audit_invoices
  AFTER INSERT OR UPDATE OR DELETE
  ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION audit_trigger();

DROP TRIGGER IF EXISTS audit_invoice_line_items ON invoice_line_items;
CREATE TRIGGER audit_invoice_line_items
  AFTER INSERT OR UPDATE OR DELETE
  ON invoice_line_items
  FOR EACH ROW
  EXECUTE FUNCTION audit_trigger();

DROP TRIGGER IF EXISTS audit_payments ON payments;
CREATE TRIGGER audit_payments
  AFTER INSERT OR UPDATE OR DELETE
  ON payments
  FOR EACH ROW
  EXECUTE FUNCTION audit_trigger();

-- ============================================================================
-- PART 7: CREATE INVOICE NUMBER GENERATION FUNCTION
-- ============================================================================

-- Function to generate unique invoice number per tenant
CREATE OR REPLACE FUNCTION app.generate_invoice_number(p_tenant_id uuid)
RETURNS text AS $$
DECLARE
  v_date_prefix text;
  v_sequence_num integer;
  v_invoice_number text;
BEGIN
  -- Get date prefix (YYYYMMDD)
  v_date_prefix := to_char(now(), 'YYYYMMDD');
  
  -- Get next sequence number for this tenant and date
  SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM 'INV-[0-9]{8}-([0-9]+)') AS integer)), 0) + 1
  INTO v_sequence_num
  FROM invoices
  WHERE tenant_id = p_tenant_id
    AND invoice_number LIKE 'INV-' || v_date_prefix || '-%';
  
  -- Format: INV-YYYYMMDD-XXXX (4-digit sequence)
  v_invoice_number := 'INV-' || v_date_prefix || '-' || LPAD(v_sequence_num::text, 4, '0');
  
  RETURN v_invoice_number;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- PART 8: CREATE FUNCTION TO UPDATE INVOICE OUTSTANDING AMOUNT
-- ============================================================================

-- Function to update invoice outstanding amount and status when payment is added/updated/deleted
CREATE OR REPLACE FUNCTION app.update_invoice_on_payment()
RETURNS TRIGGER AS $$
DECLARE
  v_total_paid decimal(10, 2);
  v_invoice_total decimal(10, 2);
  v_invoice_id uuid;
BEGIN
  -- Get invoice_id based on operation type
  IF TG_OP = 'DELETE' THEN
    v_invoice_id := OLD.invoice_id;
  ELSE
    v_invoice_id := NEW.invoice_id;
  END IF;
  
  -- Calculate total paid amount for the invoice
  SELECT COALESCE(SUM(amount), 0)
  INTO v_total_paid
  FROM payments
  WHERE invoice_id = v_invoice_id;
  
  -- Get invoice total
  SELECT total
  INTO v_invoice_total
  FROM invoices
  WHERE id = v_invoice_id;
  
  -- Update invoice
  UPDATE invoices
  SET 
    paid_amount = v_total_paid,
    outstanding_amount = v_invoice_total - v_total_paid,
    status = CASE 
      WHEN (v_invoice_total - v_total_paid) <= 0 THEN 'paid'
      WHEN due_date < CURRENT_DATE AND status != 'cancelled' THEN 'overdue'
      WHEN status = 'draft' THEN 'draft'
      ELSE 'sent'
    END,
    updated_at = now()
  WHERE id = v_invoice_id;
  
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update invoice when payment is added/updated/deleted
DROP TRIGGER IF EXISTS update_invoice_on_payment_trigger ON payments;
CREATE TRIGGER update_invoice_on_payment_trigger
  AFTER INSERT OR UPDATE OR DELETE
  ON payments
  FOR EACH ROW
  EXECUTE FUNCTION app.update_invoice_on_payment();

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- ✅ Payments tables created with RLS, triggers, and invoice number generation
-- 
-- Created tables:
--   - invoices
--   - invoice_line_items
--   - payments
--
-- Created views:
--   - app.v_invoices
--   - app.v_invoice_line_items
--   - app.v_payments
--
-- Created functions:
--   - app.generate_invoice_number(p_tenant_id)
--   - app.update_invoice_on_payment()
--
-- Security:
--   - RLS enabled on all tables
--   - RLS policies created for tenant isolation
--   - Tenant isolation triggers created
--   - Audit triggers created for all tables
-- ============================================================================
