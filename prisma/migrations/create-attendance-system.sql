-- ============================================================================
-- MILESTONE 3: ATTENDANCE & TRIP EXECUTION
-- Complete database setup for route trips and attendance tracking
-- ============================================================================

\echo ''
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo '  MILESTONE 3: Creating Attendance & Trip Execution System'
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo ''

-- ============================================================================
-- PART 1: CREATE TABLES
-- ============================================================================

\echo '📋 Part 1: Creating tables...'
\echo ''

-- Create route_trips table
CREATE TABLE IF NOT EXISTS route_trips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  route_id uuid NOT NULL REFERENCES routes(id),
  trip_date date NOT NULL,
  route_type text NOT NULL CHECK (route_type IN ('AM', 'PM')),
  driver_id uuid REFERENCES drivers(id),
  confirmed_at timestamptz,
  confirmed_by uuid,
  created_at timestamptz DEFAULT now(),
  
  CONSTRAINT unique_route_trip UNIQUE (route_id, trip_date, route_type)
);

\echo '  ✅ route_trips table created'

-- Create attendance_records table
CREATE TABLE IF NOT EXISTS attendance_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  trip_id uuid NOT NULL REFERENCES route_trips(id),
  student_id uuid NOT NULL REFERENCES students(id),
  status text NOT NULL CHECK (status IN ('boarded', 'absent', 'no_show')),
  marked_at timestamptz DEFAULT now(),
  marked_by uuid NOT NULL,
  
  CONSTRAINT unique_trip_student UNIQUE (trip_id, student_id)
);

\echo '  ✅ attendance_records table created'
\echo ''

-- ============================================================================
-- PART 2: ENABLE ROW LEVEL SECURITY
-- ============================================================================

\echo '🔒 Part 2: Enabling Row Level Security...'
\echo ''

ALTER TABLE route_trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;

\echo '  ✅ RLS enabled on route_trips'
\echo '  ✅ RLS enabled on attendance_records'
\echo ''

-- ============================================================================
-- PART 3: CREATE IMMUTABILITY FUNCTIONS
-- ============================================================================

\echo '🔐 Part 3: Creating immutability enforcement functions...'
\echo ''

-- Function to prevent modification of confirmed trips
CREATE OR REPLACE FUNCTION prevent_confirmed_trip_modification()
RETURNS TRIGGER AS $$
BEGIN
  -- Allow INSERT (no OLD row)
  IF TG_OP = 'INSERT' THEN
    RETURN NEW;
  END IF;
  
  -- Check if trip is confirmed
  IF OLD.confirmed_at IS NOT NULL THEN
    RAISE EXCEPTION 'Cannot modify confirmed trip. Trip was confirmed at %', OLD.confirmed_at;
  END IF;
  
  -- Allow UPDATE before confirmation
  IF TG_OP = 'UPDATE' THEN
    RETURN NEW;
  END IF;
  
  -- Allow DELETE before confirmation
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

\echo '  ✅ prevent_confirmed_trip_modification() created'

-- Function to prevent attendance modification after trip confirmation
CREATE OR REPLACE FUNCTION prevent_attendance_modification_after_confirmation()
RETURNS TRIGGER AS $$
DECLARE
  trip_confirmed_at timestamptz;
BEGIN
  -- Allow INSERT (check on trip will handle this)
  IF TG_OP = 'INSERT' THEN
    -- Check if trip is confirmed before allowing insert
    SELECT confirmed_at INTO trip_confirmed_at
    FROM route_trips
    WHERE id = NEW.trip_id;
    
    IF trip_confirmed_at IS NOT NULL THEN
      RAISE EXCEPTION 'Cannot add attendance to confirmed trip. Trip was confirmed at %', trip_confirmed_at;
    END IF;
    
    RETURN NEW;
  END IF;
  
  -- For UPDATE and DELETE, check OLD record's trip
  SELECT confirmed_at INTO trip_confirmed_at
  FROM route_trips
  WHERE id = OLD.trip_id;
  
  IF trip_confirmed_at IS NOT NULL THEN
    RAISE EXCEPTION 'Cannot modify attendance for confirmed trip. Trip was confirmed at %', trip_confirmed_at;
  END IF;
  
  IF TG_OP = 'UPDATE' THEN
    RETURN NEW;
  END IF;
  
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

\echo '  ✅ prevent_attendance_modification_after_confirmation() created'
\echo ''

-- ============================================================================
-- PART 4: CREATE IMMUTABILITY TRIGGERS
-- ============================================================================

\echo '⚡ Part 4: Creating immutability triggers...'
\echo ''

-- Trigger to prevent trip modification after confirmation
DROP TRIGGER IF EXISTS prevent_trip_modification_after_confirmation ON route_trips;
CREATE TRIGGER prevent_trip_modification_after_confirmation
  BEFORE UPDATE OR DELETE ON route_trips
  FOR EACH ROW
  EXECUTE FUNCTION prevent_confirmed_trip_modification();

\echo '  ✅ Trigger on route_trips created'

-- Trigger to prevent attendance modification after trip confirmation
DROP TRIGGER IF EXISTS prevent_attendance_modification_after_trip_confirmation ON attendance_records;
CREATE TRIGGER prevent_attendance_modification_after_trip_confirmation
  BEFORE INSERT OR UPDATE OR DELETE ON attendance_records
  FOR EACH ROW
  EXECUTE FUNCTION prevent_attendance_modification_after_confirmation();

\echo '  ✅ Trigger on attendance_records created'
\echo ''

-- ============================================================================
-- PART 5: CREATE AUDIT TRIGGERS
-- ============================================================================

\echo '📝 Part 5: Creating audit triggers...'
\echo ''

-- Add audit trigger for route_trips
DROP TRIGGER IF EXISTS audit_route_trips ON route_trips;
CREATE TRIGGER audit_route_trips
  AFTER INSERT OR UPDATE OR DELETE ON route_trips
  FOR EACH ROW
  EXECUTE FUNCTION audit_trigger();

\echo '  ✅ Audit trigger on route_trips created'

-- Add audit trigger for attendance_records
DROP TRIGGER IF EXISTS audit_attendance_records ON attendance_records;
CREATE TRIGGER audit_attendance_records
  AFTER INSERT OR UPDATE OR DELETE ON attendance_records
  FOR EACH ROW
  EXECUTE FUNCTION audit_trigger();

\echo '  ✅ Audit trigger on attendance_records created'
\echo ''

-- ============================================================================
-- PART 6: CREATE DATABASE VIEWS
-- ============================================================================

\echo '👁️  Part 6: Creating database views for RLS...'
\echo ''

-- Create view for route_trips
DROP VIEW IF EXISTS app.v_route_trips CASCADE;
CREATE OR REPLACE VIEW app.v_route_trips AS
SELECT * FROM route_trips
WHERE tenant_id = app.get_current_tenant_id();

\echo '  ✅ app.v_route_trips view created'

-- Create view for attendance_records
DROP VIEW IF EXISTS app.v_attendance_records CASCADE;
CREATE OR REPLACE VIEW app.v_attendance_records AS
SELECT * FROM attendance_records
WHERE tenant_id = app.get_current_tenant_id();

\echo '  ✅ app.v_attendance_records view created'
\echo ''

-- ============================================================================
-- PART 7: CREATE RLS POLICIES
-- ============================================================================

\echo '🔐 Part 7: Creating RLS policies...'
\echo ''

-- Route Trips RLS Policies
DROP POLICY IF EXISTS tenant_isolation_route_trips ON route_trips;
CREATE POLICY tenant_isolation_route_trips ON route_trips
  FOR ALL
  USING (
    tenant_id = current_setting('app.current_tenant_id', true)::uuid
  )
  WITH CHECK (
    tenant_id = current_setting('app.current_tenant_id', true)::uuid
  );

\echo '  ✅ tenant_isolation_route_trips policy created'

-- Attendance Records RLS Policies
DROP POLICY IF EXISTS tenant_isolation_attendance_records ON attendance_records;
CREATE POLICY tenant_isolation_attendance_records ON attendance_records
  FOR ALL
  USING (
    tenant_id = current_setting('app.current_tenant_id', true)::uuid
  )
  WITH CHECK (
    tenant_id = current_setting('app.current_tenant_id', true)::uuid
  );

\echo '  ✅ tenant_isolation_attendance_records policy created'
\echo ''

-- ============================================================================
-- PART 8: CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

\echo '⚡ Part 8: Creating indexes for performance...'
\echo ''

-- Indexes on route_trips
CREATE INDEX IF NOT EXISTS idx_route_trips_tenant_id ON route_trips(tenant_id);
CREATE INDEX IF NOT EXISTS idx_route_trips_route_id ON route_trips(route_id);
CREATE INDEX IF NOT EXISTS idx_route_trips_driver_id ON route_trips(driver_id);
CREATE INDEX IF NOT EXISTS idx_route_trips_trip_date ON route_trips(trip_date);
CREATE INDEX IF NOT EXISTS idx_route_trips_confirmed_at ON route_trips(confirmed_at);

\echo '  ✅ Indexes on route_trips created'

-- Indexes on attendance_records
CREATE INDEX IF NOT EXISTS idx_attendance_records_tenant_id ON attendance_records(tenant_id);
CREATE INDEX IF NOT EXISTS idx_attendance_records_trip_id ON attendance_records(trip_id);
CREATE INDEX IF NOT EXISTS idx_attendance_records_student_id ON attendance_records(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_records_status ON attendance_records(status);

\echo '  ✅ Indexes on attendance_records created'
\echo ''

-- ============================================================================
-- VERIFICATION
-- ============================================================================

\echo '✅ Part 9: Verifying installation...'
\echo ''

-- Verify tables exist
SELECT 
  table_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_tables 
      WHERE schemaname = 'public' 
      AND tablename = table_name
    ) THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END as status
FROM (
  VALUES ('route_trips'), ('attendance_records')
) AS t(table_name);

\echo ''

-- Verify RLS is enabled
SELECT 
  tablename,
  CASE 
    WHEN rowsecurity THEN '✅ ENABLED'
    ELSE '❌ DISABLED'
  END as rls_status
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('route_trips', 'attendance_records');

\echo ''

-- Verify triggers exist
SELECT 
  trigger_name,
  event_object_table,
  '✅ EXISTS' as status
FROM information_schema.triggers
WHERE event_object_schema = 'public'
AND event_object_table IN ('route_trips', 'attendance_records')
ORDER BY event_object_table, trigger_name;

\echo ''
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo '  ✅ Milestone 3 Database Setup Complete!'
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo ''
\echo 'Summary:'
\echo '  • Tables: route_trips, attendance_records'
\echo '  • RLS: Enabled with tenant isolation'
\echo '  • Immutability: Enforced via triggers'
\echo '  • Audit: All changes logged automatically'
\echo '  • Views: app.v_route_trips, app.v_attendance_records'
\echo ''
\echo 'Next Steps:'
\echo '  1. Run Prisma generate to update client'
\echo '  2. Implement server actions in lib/actions.ts'
\echo '  3. Build UI components'
\echo ''

