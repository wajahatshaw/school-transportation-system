-- Migration: Add auth_user_id to users table
-- This migration adds the auth_user_id column to map Supabase Auth users to internal users

-- Add auth_user_id column (if not exists)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS auth_user_id TEXT UNIQUE;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_users_auth_user_id 
ON users(auth_user_id);

-- Add comment for documentation
COMMENT ON COLUMN users.auth_user_id IS 'Supabase Auth user ID (auth.users.id) - maps external auth to internal user record';

