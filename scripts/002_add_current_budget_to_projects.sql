-- Add current_budget column to projects table
ALTER TABLE projects
ADD COLUMN current_budget NUMERIC;

-- Optional: Set current_budget to match budget for existing projects
UPDATE projects
SET current_budget = budget
WHERE current_budget IS NULL;

-- Add comment to describe the column
COMMENT ON COLUMN projects.current_budget IS 'Current budget spent or allocated for the project';
