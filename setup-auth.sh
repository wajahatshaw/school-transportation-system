#!/bin/bash

# Authentication Setup Script
# This script helps set up the authentication system for the School Transportation Management System

set -e

echo "🔐 School Transportation Management - Authentication Setup"
echo "=========================================================="
echo ""

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo "⚠️  .env.local not found!"
    echo ""
    echo "Please create .env.local with the following variables:"
    echo ""
    echo "NEXT_PUBLIC_SUPABASE_URL=your-project-url.supabase.co"
    echo "NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key"
    echo "DATABASE_URL=your-database-connection-string"
    echo ""
    echo "See .env.example for reference"
    echo ""
    read -p "Press enter to continue once you've created .env.local..."
fi

# Check if Supabase variables are set
source .env.local
if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ] || [ -z "$NEXT_PUBLIC_SUPABASE_ANON_KEY" ]; then
    echo "❌ Missing Supabase configuration in .env.local"
    exit 1
fi

echo "✅ Environment variables found"
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
npm install
echo "✅ Dependencies installed"
echo ""

# Generate Prisma client
echo "🔄 Generating Prisma client..."
npx prisma generate || {
    echo "⚠️  Prisma generate failed. This might be a Node version issue."
    echo "   The app should still work if you've previously generated the client."
}
echo ""

# Push schema to database
echo "🗄️  Pushing schema to database..."
read -p "Do you want to push the schema to your database? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    npx prisma db push
    echo "✅ Schema pushed to database"
else
    echo "⏭️  Skipped schema push"
fi
echo ""

# Reminder about migrations
echo "📝 Don't forget to run the auth migration:"
echo "   psql \$DATABASE_URL -f prisma/migrations/add_auth_user_id.sql"
echo ""

# Setup checklist
echo "✅ Setup Complete!"
echo ""
echo "📋 Next Steps:"
echo ""
echo "1. Create a tenant in your database:"
echo "   INSERT INTO tenants (name) VALUES ('Your School District');"
echo ""
echo "2. Start the development server:"
echo "   npm run dev"
echo ""
echo "3. Navigate to http://localhost:3000"
echo ""
echo "4. Sign up with an email/password"
echo ""
echo "5. Create a membership for your user:"
echo "   INSERT INTO memberships (user_id, tenant_id, role)"
echo "   VALUES ("
echo "     (SELECT id FROM users WHERE email = 'your-email@example.com'),"
echo "     'your-tenant-id',"
echo "     'admin'"
echo "   );"
echo ""
echo "6. Log in and select your tenant"
echo ""
echo "📚 For detailed setup instructions, see AUTH_SETUP.md"
echo ""

