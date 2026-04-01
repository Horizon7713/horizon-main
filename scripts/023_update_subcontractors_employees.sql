-- Update subcontractors table to use JSONB for employees column
-- This allows storing an array of employee user IDs instead of just a count

-- First, create a backup column with the old integer values
ALTER TABLE subcontractors ADD COLUMN IF NOT EXISTS employees_count INTEGER;
UPDATE subcontractors SET employees_count = employees WHERE employees IS NOT NULL;

-- Drop the old employees column and recreate it as JSONB
ALTER TABLE subcontractors DROP COLUMN IF EXISTS employees;
ALTER TABLE subcontractors ADD COLUMN employees JSONB DEFAULT '[]'::jsonb;

-- Add a comment explaining the column
COMMENT ON COLUMN subcontractors.employees IS 'Array of employee user IDs (UUIDs) stored as JSONB';
