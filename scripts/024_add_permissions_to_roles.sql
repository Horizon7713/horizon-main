-- Add permissions column to roles table
ALTER TABLE roles
ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '[]'::jsonb;

-- Add comment to explain the column
COMMENT ON COLUMN roles.permissions IS 'JSONB array storing permission strings or objects for this role';
