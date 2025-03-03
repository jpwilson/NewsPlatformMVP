-- Add description and created_at columns to users table
ALTER TABLE users ADD COLUMN description TEXT;
ALTER TABLE users ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Add supabase_uid column to users table if it doesn't exist
-- This is added based on our analysis of the codebase which uses this field
ALTER TABLE users ADD COLUMN supabase_uid TEXT; 