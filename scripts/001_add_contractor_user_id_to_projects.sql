-- Add contractor_user_id column to projects table
ALTER TABLE projects
ADD COLUMN contractor_user_id uuid;

-- Update all existing projects to have the specified contractor_user_id
UPDATE projects
SET contractor_user_id = 'faa85fbd-1fa9-465d-8dda-868fa8313311';

-- Add comment to document the column
COMMENT ON COLUMN projects.contractor_user_id IS 'The user ID of the contractor who owns this project';
