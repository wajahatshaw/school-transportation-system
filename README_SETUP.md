# School Transportation Management System

A multi-tenant School Transportation Management system built with Next.js, Tailwind CSS, and Prisma.

## Features

✅ **Multi-Tenant Dashboard**
- Shows current tenant name at the top
- Sidebar navigation with links to all sections

✅ **Students Management**
- View all students in a table (First Name, Last Name, Grade)
- Add new students via modal form
- Edit existing students
- Soft delete functionality (deleted students don't appear in list)

✅ **Drivers Management**
- View all drivers in a table (First Name, Last Name, License Number)
- Add new drivers via modal form
- Edit existing drivers
- Click driver to view compliance documents

✅ **Driver Compliance Documents**
- View all compliance documents for a selected driver
- Add new compliance documents
- Edit existing documents
- Delete documents
- **Visual indicators:**
  - Red background for expired documents
  - Yellow background for documents expiring in next 30 days
  - Green status badge for valid documents

✅ **Audit Logs**
- View all audit logs with filtering
- Filter by table name and action type
- View JSON data for "before" and "after" states
- Color-coded action badges (CREATE=green, UPDATE=blue, DELETE=red)

## Tech Stack

- **Next.js 16** (App Router)
- **Tailwind CSS** for styling
- **Prisma 7** with PostgreSQL adapter
- **Supabase** PostgreSQL database
- **TypeScript**

## Setup Instructions

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Set up Environment Variables**
   Create a `.env` file in the root directory:
   ```env
   DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres?sslmode=require"
   ```
   Get your connection string from Supabase Dashboard → Project Settings → Database

3. **Generate Prisma Client**
   ```bash
   npx prisma generate
   ```

4. **Run Database Migrations** (if needed)
   ```bash
   npx prisma migrate dev
   ```

5. **Start Development Server**
   ```bash
   npm run dev
   ```

6. **Access the Application**
   Open [http://localhost:3000](http://localhost:3000) - it will redirect to `/dashboard`

## Project Structure

```
app/
  dashboard/
    layout.tsx          # Dashboard layout with sidebar
    page.tsx            # Dashboard home page
    students/
      page.tsx          # Students list page
    drivers/
      page.tsx          # Drivers list page
      [driverId]/
        compliance/
          page.tsx      # Compliance documents for a driver
    compliance/
      page.tsx          # Compliance overview (select driver)
    audit-logs/
      page.tsx          # Audit logs with filtering

components/
  NavLink.tsx                    # Navigation link component
  StudentsTable.tsx              # Students table component
  AddStudentButton.tsx           # Add student modal
  EditStudentModal.tsx            # Edit student modal
  DriversTable.tsx               # Drivers table component
  AddDriverButton.tsx            # Add driver modal
  EditDriverModal.tsx             # Edit driver modal
  ComplianceDocumentsTable.tsx   # Compliance documents table
  AddComplianceDocumentButton.tsx # Add compliance document modal
  EditComplianceDocumentModal.tsx # Edit compliance document modal
  AuditLogsTable.tsx             # Audit logs table with filters

lib/
  prisma.ts    # Prisma Client setup with PostgreSQL adapter
  actions.ts   # Server actions for all CRUD operations
```

## Multi-Tenant Isolation

All database operations are automatically scoped to the current tenant. The system:
- Gets or creates a default tenant on first use
- Filters all queries by `tenantId`
- Ensures data isolation between tenants

**Note:** In production, you should replace the `getCurrentTenantId()` function in `lib/actions.ts` to get the tenant from your authentication/session system.

## Database Schema

The system uses the following Prisma models:
- `Tenant` - Multi-tenant organization
- `Student` - Student records (with soft delete)
- `Driver` - Driver records (with soft delete)
- `DriverComplianceDocument` - Compliance documents for drivers
- `AuditLog` - Audit trail for all changes
- `Membership` - User-tenant relationships (for future auth)

## Key Features Implementation

### Soft Delete
Students, drivers, and compliance documents use soft delete (`deleted_at` timestamp and `deleted_by` user ID) - deleted records don't appear in lists but remain in the database for audit purposes. RLS policies automatically exclude records where `deleted_at IS NOT NULL`.

### Compliance Expiration Tracking
Compliance documents are automatically highlighted:
- **Red**: Expired documents
- **Yellow**: Expiring within 30 days
- **Green**: Valid documents

### Audit Logging
All CREATE, UPDATE, and DELETE operations are automatically logged with:
- Action type
- Table name
- Record ID
- Before/after JSON snapshots
- Timestamp
- User ID (when available)

## Next Steps

1. **Add Authentication**: Implement user authentication and replace the default tenant logic
2. **Add File Upload**: Implement file upload for compliance documents
3. **Add Search/Filter**: Add search functionality to students and drivers tables
4. **Add Pagination**: Implement pagination for large datasets
5. **Add Export**: Add CSV/PDF export functionality

## Troubleshooting

### Database Connection Issues
- Ensure your Supabase database is not paused
- Check that your connection string includes `?sslmode=require`
- Verify your DATABASE_URL in `.env` file

### Prisma Issues
- Run `npx prisma generate` after schema changes
- Run `npx prisma db pull` to sync schema with database

