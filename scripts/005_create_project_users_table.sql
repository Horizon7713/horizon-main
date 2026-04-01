-- Create project_users table for managing user assignments to projects
-- This table tracks which users are assigned to which projects, their roles, and permissions

CREATE TABLE IF NOT EXISTS project_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_in_project TEXT NOT NULL,
  permissions JSONB DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'active',
  invited_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure a user can only be assigned to a project once
  UNIQUE(project_id, user_id)
);

-- Create indexes for better query performance
CREATE INDEX idx_project_users_project_id ON project_users(project_id);
CREATE INDEX idx_project_users_user_id ON project_users(user_id);
CREATE INDEX idx_project_users_status ON project_users(status);

-- Add RLS policies
ALTER TABLE project_users ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view project_users for projects they're assigned to
CREATE POLICY "Users can view project_users for their projects"
  ON project_users
  FOR SELECT
  USING (
    project_id IN (
      SELECT id FROM projects 
      WHERE contractor_user_id = auth.uid()
      OR auth.uid() = ANY(users)
    )
    OR user_id IN (
      SELECT id FROM users WHERE auth_id = auth.uid()
    )
  );

-- Policy: Contractors can insert project_users for their projects
CREATE POLICY "Contractors can add users to their projects"
  ON project_users
  FOR INSERT
  WITH CHECK (
    project_id IN (
      SELECT id FROM projects WHERE contractor_user_id = auth.uid()
    )
  );

-- Policy: Contractors can update project_users for their projects
CREATE POLICY "Contractors can update users in their projects"
  ON project_users
  FOR UPDATE
  USING (
    project_id IN (
      SELECT id FROM projects WHERE contractor_user_id = auth.uid()
    )
  );

-- Policy: Contractors can delete project_users from their projects
CREATE POLICY "Contractors can remove users from their projects"
  ON project_users
  FOR DELETE
  USING (
    project_id IN (
      SELECT id FROM projects WHERE contractor_user_id = auth.uid()
    )
  );

-- Add a trigger to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_project_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_project_users_updated_at
  BEFORE UPDATE ON project_users
  FOR EACH ROW
  EXECUTE FUNCTION update_project_users_updated_at();

-- Add a comment to the table
COMMENT ON TABLE project_users IS 'Manages user assignments to projects with roles and permissions';
