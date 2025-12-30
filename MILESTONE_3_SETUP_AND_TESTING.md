# Milestone 3: Attendance System - Setup & Testing Guide

## Prerequisites

Before running the system, ensure you have:
- PostgreSQL database configured
- Supabase connection or direct database access
- Node.js and npm installed
- Environment variables configured

## Setup Instructions

### 1. Generate Prisma Client

```bash
npx prisma generate
```

This will generate the Prisma client with the new `RouteTrip` and `AttendanceRecord` models.

### 2. Run Database Migration

```bash
psql -h <your-db-host> -U <your-db-user> -d <your-database> -f prisma/migrations/create-attendance-system.sql
```

Or if using Supabase:
```bash
psql "<your-supabase-connection-string>" -f prisma/migrations/create-attendance-system.sql
```

This migration will:
- Create `route_trips` and `attendance_records` tables
- Enable Row Level Security (RLS)
- Create immutability triggers
- Set up audit logging
- Create database views
- Add performance indexes

### 3. Verify Migration

After running the migration, you should see output confirming:
- ✅ Tables created
- ✅ RLS enabled
- ✅ Triggers created
- ✅ Views created
- ✅ Indexes created

### 4. Start the Development Server

```bash
npm run dev
```

## Testing Checklist

### Database Level Tests

#### 1. RLS Policy Verification
- [ ] Verify cross-tenant access is blocked
- [ ] Confirm users can only see their tenant's data
- [ ] Test that drivers can only access their own trips

#### 2. Immutability Tests
- [ ] Create a trip and mark attendance
- [ ] Confirm the trip
- [ ] Attempt to update trip after confirmation (should fail)
- [ ] Attempt to delete attendance after confirmation (should fail)
- [ ] Verify error messages indicate immutability

#### 3. Audit Logging
- [ ] Create a trip - check audit log
- [ ] Mark attendance - check audit log
- [ ] Confirm trip - check audit log
- [ ] Verify all operations are logged with user_id and timestamp

### Application Flow Tests

#### Driver Flow
1. **Login and Navigation**
   - [ ] Login as a user
   - [ ] Navigate to "My Trips"
   - [ ] Verify page loads successfully

2. **Create Trip**
   - [ ] View today's routes (AM/PM tabs)
   - [ ] Click "Start Trip" on available route
   - [ ] Verify trip is created
   - [ ] Navigate to trip detail page

3. **Add Students**
   - [ ] Click "Add Student to Trip"
   - [ ] Select a student from dropdown
   - [ ] Click "Add"
   - [ ] Verify student appears in list

4. **Mark Attendance**
   - [ ] Click "Boarded" for a student
   - [ ] Verify status updates to green badge
   - [ ] Click "Absent" for another student
   - [ ] Verify status updates to yellow badge
   - [ ] Click "No Show" for another student
   - [ ] Verify status updates to red badge

5. **Update Attendance (Before Confirmation)**
   - [ ] Change a student's status
   - [ ] Verify status updates successfully
   - [ ] Verify toast notification appears

6. **Remove Student (Before Confirmation)**
   - [ ] Click remove button on a student
   - [ ] Confirm removal dialog
   - [ ] Verify student is removed from trip

7. **Confirm Trip**
   - [ ] Review attendance summary stats
   - [ ] Click "Confirm Trip"
   - [ ] Read warning dialog
   - [ ] Click "Yes, Confirm Trip"
   - [ ] Verify trip shows "Confirmed" badge
   - [ ] Verify UI becomes read-only (buttons disabled)

8. **Attempt Edit After Confirmation**
   - [ ] Try to change student status (should be disabled)
   - [ ] Try to add student (button should be hidden/disabled)
   - [ ] Try to remove student (button should be hidden/disabled)

#### Admin Flow
1. **View Attendance History**
   - [ ] Navigate to "Attendance"
   - [ ] Verify page loads with filters
   - [ ] See list of trips

2. **Filter Trips**
   - [ ] Filter by date range
   - [ ] Filter by specific route
   - [ ] Filter by driver
   - [ ] Filter by AM/PM
   - [ ] Verify results update accordingly

3. **View Trip Details**
   - [ ] Click on a trip in the table
   - [ ] Navigate to trip detail page
   - [ ] Verify trip information displays
   - [ ] Verify statistics (boarded, absent, no-show) display
   - [ ] Verify student attendance table shows correctly

4. **View Audit Trail**
   - [ ] Click "Show Audit Log"
   - [ ] Verify audit entries appear
   - [ ] Check timestamps and user IDs
   - [ ] Verify actions are logged (INSERT, UPDATE)

### Edge Cases & Error Handling

#### Trip Creation
- [ ] Try creating duplicate trip (same route, date, type) - should fail
- [ ] Try creating trip for non-existent route - should fail
- [ ] Verify error messages are clear

#### Attendance
- [ ] Try marking attendance on confirmed trip - should fail
- [ ] Try adding student to confirmed trip - should fail
- [ ] Try removing student from confirmed trip - should fail
- [ ] Verify error toasts appear

#### Data Integrity
- [ ] Verify unique constraint on (trip_id, student_id)
- [ ] Verify unique constraint on (route_id, trip_date, route_type)
- [ ] Try adding same student twice - should fail

### UI/UX Tests

#### Responsiveness
- [ ] Test on desktop (1920x1080)
- [ ] Test on tablet (768x1024)
- [ ] Test on mobile (375x667)
- [ ] Verify tables scroll horizontally on small screens

#### Performance
- [ ] Load trip with 50+ students
- [ ] Verify page loads in < 3 seconds
- [ ] Verify attendance marking is instant
- [ ] Check network tab for unnecessary requests

#### Accessibility
- [ ] Verify all buttons have clear labels
- [ ] Check color contrast on status badges
- [ ] Verify keyboard navigation works
- [ ] Test screen reader compatibility (basic)

## Known Limitations & Future Enhancements

### Current Limitations
1. **Driver Authentication**: Currently, any user can access "My Trips". In production, add role-based access control to restrict drivers to only see trips assigned to them.
2. **Bulk Operations**: No bulk add/remove students or bulk status updates.
3. **Notifications**: No real-time notifications when trips are confirmed.
4. **Offline Support**: No offline capability for marking attendance.

### Future Enhancements
1. **GPS Tracking**: Integrate real-time GPS tracking for vehicles
2. **Push Notifications**: Notify parents when student boards/doesn't board
3. **Photo Verification**: Take photos when marking attendance
4. **Route Optimization**: Suggest optimal routes based on student locations
5. **Reporting**: Generate PDF reports for attendance history
6. **Mobile App**: Native mobile app for drivers
7. **Parent Portal**: Allow parents to view their child's attendance

## Troubleshooting

### Migration Issues

**Problem**: Migration fails with "relation already exists"
```
Solution: Tables already exist. Drop them first or skip migration.
```

**Problem**: RLS policies fail to create
```
Solution: Ensure you have SUPERUSER privileges or appropriate permissions.
```

**Problem**: Triggers not working
```
Solution: Verify audit_trigger() function exists. Run fix-audit-trigger.sql if needed.
```

### Application Issues

**Problem**: "Trip not found or access denied"
```
Solution: Verify tenant_id is set correctly in session. Check RLS policies.
```

**Problem**: Cannot modify attendance
```
Solution: Check if trip is confirmed. Check browser console for errors.
```

**Problem**: Prisma client errors
```
Solution: Run npx prisma generate again. Clear node_modules and reinstall if needed.
```

### Performance Issues

**Problem**: Slow page loads
```
Solution: 
1. Check database indexes are created
2. Verify connection pooling is configured
3. Enable query logging to identify slow queries
4. Consider adding Redis cache for frequently accessed data
```

## Security Considerations

### Production Checklist
- [ ] Enable HTTPS only
- [ ] Set secure cookies (httpOnly, secure, sameSite)
- [ ] Rate limit API endpoints
- [ ] Validate all user inputs
- [ ] Sanitize SQL queries (Prisma handles this)
- [ ] Enable CORS with specific origins
- [ ] Add API authentication tokens
- [ ] Implement role-based access control (RBAC)
- [ ] Log all security-related events
- [ ] Regular security audits
- [ ] Keep dependencies updated

## Success Criteria

All of the following must be true:
- ✅ Database migration runs without errors
- ✅ RLS policies prevent cross-tenant access
- ✅ Immutability triggers prevent post-confirmation edits
- ✅ Audit logs capture all operations
- ✅ Driver can create trips and mark attendance
- ✅ Driver can confirm trips
- ✅ Admin can view all attendance history
- ✅ UI is responsive and accessible
- ✅ Error handling is graceful and informative
- ✅ Performance is acceptable (< 3s page loads)

## Support

For issues or questions:
1. Check this document's troubleshooting section
2. Review audit logs for error details
3. Check browser console for client-side errors
4. Review server logs for backend errors
5. Consult the implementation plan document

---

**Last Updated**: December 29, 2025
**Version**: 1.0.0 (Milestone 3)

