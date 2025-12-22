# Supabase Connection Guide for Prisma

## Common Connection Issues and Solutions

### Issue: "Can't reach database server"

This error usually happens due to one of these reasons:

1. **Database is Paused** (Most Common)
   - Supabase free tier pauses databases after 1 week of inactivity
   - **Solution**: Go to your Supabase Dashboard → Project Settings → and click "Restore" or "Resume" to wake up your database

2. **Missing SSL in Connection String**
   - Supabase requires SSL connections
   - **Solution**: Add `?sslmode=require` to your connection string

3. **Wrong Connection String Type**
   - For Prisma migrations and `db pull`, use the **Direct Connection** (port 5432)
   - For application queries, use the **Session Pooler** (port 5432) or **Transaction Pooler** (port 6543)

## Connection String Formats

### For Prisma Migrations and `db pull` (Direct Connection):
```
postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres?sslmode=require
```

### For Application (Session Pooler - Recommended):
```
postgresql://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres?sslmode=require
```

### For Application (Transaction Pooler - Serverless):
```
postgresql://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?sslmode=require
```

## Steps to Fix:

1. **Wake up your database** (if paused):
   - Go to https://supabase.com/dashboard
   - Select your project
   - If you see "Paused", click "Restore"

2. **Get the correct connection string**:
   - Go to Project Settings → Database
   - Under "Connection string", select "URI" format
   - Copy the connection string
   - **Make sure to add `?sslmode=require` at the end**

3. **Update your `.env` file**:
   ```env
   DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres?sslmode=require"
   ```

4. **Test the connection**:
   ```bash
   npx prisma db pull
   ```

## Additional Notes:

- Replace `[YOUR-PASSWORD]` with your actual database password
- Replace `[PROJECT-REF]` with your Supabase project reference (e.g., `gszsteolahzypsybsopi`)
- Replace `[REGION]` with your database region (e.g., `us-east-1`)

