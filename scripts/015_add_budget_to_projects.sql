-- Add budget column to projects table
ALTER TABLE projects
ADD COLUMN budget DECIMAL(12, 2);

-- Add a comment to describe the column
COMMENT ON COLUMN projects.budget IS 'Project budget in dollars';
