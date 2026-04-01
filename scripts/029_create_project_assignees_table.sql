-- Create project_assignees table
-- This table stores assignees for projects who may or may not be users in the system

CREATE TABLE IF NOT EXISTS project_assignees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  permissions JSONB DEFAULT '{}',
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_project_assignees_project_id ON project_assignees(project_id);
CREATE INDEX IF NOT EXISTS idx_project_assignees_role ON project_assignees(role);

-- Enable Row Level Security
ALTER TABLE project_assignees ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Contractors can manage assignees for their projects
CREATE POLICY "Contractors can manage assignees for their projects"
  ON project_assignees
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_assignees.project_id
      AND projects.contractor_user_id = auth.uid()
    )
  );

-- Users can view assignees for projects they're part of
CREATE POLICY "Users can view assignees for their projects"
  ON project_assignees
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM project_users
      WHERE project_users.project_id = project_assignees.project_id
      AND project_users.user_id = (
        SELECT id FROM users WHERE auth_id = auth.uid()
      )
      AND project_users.status = 'active'
    )
  );

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_project_assignees_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_project_assignees_updated_at
  BEFORE UPDATE ON project_assignees
  FOR EACH ROW
  EXECUTE FUNCTION update_project_assignees_updated_at();
