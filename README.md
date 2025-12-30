# School Transportation Management System

A modern, secure, multi-tenant SaaS platform for managing school transportation operations. Built with Next.js, Prisma, PostgreSQL, and Supabase Auth.

## 🌟 Features

- **🔐 Secure Authentication** - Email/password authentication powered by Supabase
- **🏢 Multi-Tenant Architecture** - Complete data isolation between organizations
- **🛡️ Row-Level Security** - Database-enforced security policies (RLS)
- **👥 User Management** - Role-based access control per organization
- **🚌 Driver Management** - Track drivers and their information
- **👨‍🎓 Student Management** - Manage student records and assignments
- **🚍 Route & Vehicle Management** - Assign vehicles and drivers to routes
- **📋 Daily Attendance Tracking** - Mark student attendance per trip with confirmation
- **🔒 Immutable Records** - Confirmed trips cannot be modified (database-enforced)
- **📋 Compliance Tracking** - Monitor driver documents and expiration dates
- **📊 Audit Logging** - Automatic tracking of all data changes
- **🔄 Tenant Switching** - Easy switching between organizations
- **🎨 Modern UI** - Clean, responsive interface built with Tailwind CSS

## 🎯 Milestones Completed

### ✅ Milestone 1: Core Infrastructure
- Multi-tenant architecture with RLS
- Student and driver CRUD operations
- Audit logging system
- Authentication with Supabase

### ✅ Milestone 2: Compliance Management
- Driver compliance document tracking
- Expiration alerts and monitoring
- Document soft-delete with audit trail
- Compliance dashboard

### ✅ Milestone 3: Attendance & Trip Execution
- Daily trip management with AM/PM types
- Student attendance tracking (boarded/absent/no-show)
- Driver confirmation flow with immutability
- Attendance history and reporting
- Manual student assignment per trip
- Database-enforced immutability for confirmed trips

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ (20+ recommended)
- PostgreSQL database
- Supabase account (for authentication)

### Setup in 5 Minutes

1. **Clone and Install**
   ```bash
   git clone <your-repo>
   cd school-transportation-system
   npm install
   ```

2. **Configure Environment**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your Supabase credentials
   ```

3. **Setup Database**
   ```bash
   npx prisma db push
   psql $DATABASE_URL -f prisma/migrations/add_auth_user_id.sql
   ```

4. **Create Test Tenant**
   ```bash
   psql $DATABASE_URL -c "INSERT INTO tenants (name) VALUES ('Test School');"
   ```

5. **Start Development Server**
   ```bash
   npm run dev
   ```

6. **Sign Up and Configure**
   - Visit http://localhost:3000
   - Create an account
   - Run SQL to add user to tenant (see QUICKSTART.md)

📚 **For detailed setup instructions, see [QUICKSTART.md](./QUICKSTART.md)**

## 📖 Documentation

- **[QUICKSTART.md](./QUICKSTART.md)** - Get up and running in 5 minutes
- **[AUTH_SETUP.md](./AUTH_SETUP.md)** - Complete authentication setup guide
- **[AUTH_IMPLEMENTATION.md](./AUTH_IMPLEMENTATION.md)** - Implementation details and architecture
- **[lib/RLS_IMPLEMENTATION.md](./lib/RLS_IMPLEMENTATION.md)** - Row-level security documentation

## 🏗️ Architecture

### Technology Stack

- **Frontend:** Next.js 15 (App Router), React 19, Tailwind CSS
- **Backend:** Next.js API Routes, Server Actions
- **Database:** PostgreSQL with Prisma ORM
- **Authentication:** Supabase Auth
- **Security:** Row-Level Security (RLS), Audit Triggers

### Security Model

```
┌─────────────────────────────────────────────────┐
│           User Authentication                    │
│              (Supabase Auth)                     │
└────────────────┬────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────┐
│         Session Management                       │
│    (Server-side, httpOnly cookies)              │
└────────────────┬────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────┐
│        Tenant Selection                          │
│   (User selects organization)                    │
└────────────────┬────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────┐
│      Database Context Wrapper                    │
│       (withTenantContext)                        │
│                                                   │
│  Sets PostgreSQL session variables:              │
│  - app.current_tenant_id                         │
│  - app.current_user_id                           │
│  - app.current_user_ip                           │
└────────────────┬────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────┐
│     Row-Level Security (RLS)                     │
│  Database enforces tenant isolation              │
└────────────────┬────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────┐
│         Audit Triggers                           │
│  Automatic logging of all changes               │
└─────────────────────────────────────────────────┘
```

### Key Security Features

1. **Authentication** - Supabase handles password hashing and session management
2. **Authorization** - User-to-tenant membership validation
3. **Tenant Isolation** - RLS policies prevent cross-tenant data access
4. **Audit Trail** - All changes logged with user and tenant context
5. **No Client Trust** - User/tenant IDs never accepted from client

## 🔒 Security Principles

### ✅ Never Trust Client Input
- User ID always from server session
- Tenant ID always from server session
- No user/tenant IDs in request bodies

### ✅ Database is Authority
- RLS policies are final enforcement
- Cannot bypass from application code
- Audit logs created by triggers

### ✅ Defense in Depth
- Middleware protects routes
- Session validates access
- Context wrapper enforces transaction
- RLS provides final guarantee

## 📁 Project Structure

```
school-transportation-system/
├── app/
│   ├── api/                    # API routes
│   ├── dashboard/              # Main application pages
│   ├── login/                  # Authentication pages
│   └── select-tenant/          # Tenant selection
├── components/
│   ├── layout/                 # Layout components
│   └── ui/                     # Reusable UI components
├── lib/
│   ├── auth/                   # Authentication utilities
│   │   ├── session.ts         # Session management
│   │   └── actions.ts         # Auth server actions
│   ├── supabase/              # Supabase clients
│   │   ├── server.ts          # Server-side client
│   │   ├── client.ts          # Client-side client
│   │   └── middleware.ts      # Auth middleware
│   ├── actions.ts             # Server actions
│   ├── prisma.ts              # Prisma client
│   └── withTenantContext.ts   # RLS context wrapper
├── prisma/
│   ├── schema.prisma          # Database schema
│   └── migrations/            # SQL migrations
├── middleware.ts              # Next.js middleware
└── [documentation files]
```

## 🧪 Testing

### Test Authentication Flow

1. Sign up with test email
2. Create tenant and membership via SQL
3. Log in and select tenant
4. Verify dashboard access
5. Create/edit/delete records
6. Check audit logs
7. Switch tenants (if multi-tenant)

### Verify Security

1. Try accessing data from wrong tenant (should fail)
2. Check audit logs show correct user/tenant
3. Verify RLS blocks unauthorized queries
4. Test logout clears session properly

## 🚢 Deployment

### Environment Variables

Set these in your production environment:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
DATABASE_URL=...
```

### Pre-Deployment Checklist

- [ ] Environment variables configured
- [ ] Database migrations applied
- [ ] RLS policies enabled
- [ ] Audit triggers created
- [ ] Supabase auth configured (email templates, redirect URLs)
- [ ] Test user and tenant created
- [ ] Security review completed

### Recommended Platforms

- **Vercel** - Optimized for Next.js
- **Netlify** - Easy deployment with plugins
- **Railway** - Full-stack deployment
- **Supabase** - Database + auth in one platform

## 🤝 Contributing

This is a production-ready template for school transportation management. Feel free to:

- Customize for your specific needs
- Add additional features
- Improve security measures
- Enhance the UI/UX

## 📄 License

See [LICENSE](./LICENSE) file for details.

## 🆘 Support

For issues or questions:

1. Check the documentation files (QUICKSTART.md, AUTH_SETUP.md)
2. Review the troubleshooting sections
3. Check Supabase and Next.js documentation
4. Open an issue in the repository

## 🎓 Learn More

### Technologies Used

- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [PostgreSQL RLS](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [Tailwind CSS](https://tailwindcss.com/docs)

### Key Concepts

- **Row-Level Security (RLS)** - Database-level security policies
- **Multi-Tenancy** - Serving multiple organizations from one app
- **Server Actions** - Type-safe server mutations in Next.js
- **Session Management** - Secure user session handling
- **Audit Logging** - Compliance and change tracking

---

**Built with ❤️ for secure, scalable school transportation management**
