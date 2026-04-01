-- Fix RLS policies for project_users table to properly check auth_id vs profile id

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view project_users for their projects" ON project_users;
DROP POLICY IF EXISTS "Contractors can add users to their projects" ON project_users;
DROP POLICY IF EXISTS "Contractors can update users in their projects" ON project_users;
DROP POLICY IF EXISTS "Contractors can remove users from their projects" ON project_users;

-- Policy: Users can view project_users for projects they're assigned to or own
CREATE POLICY "Users can view project_users for their projects"
  ON project_users
  FOR SELECT
  USING (
    -- User is assigned to the project
    user_id IN (
      SELECT id FROM users WHERE auth_id = auth.uid()
    )
    OR
    -- User is the contractor who owns the project
    project_id IN (
      SELECT p.id FROM projects p
      JOIN users u ON p.contractor_user_id = u.id
      WHERE u.auth_id = auth.uid()
    )
  );

-- Policy: Contractors can insert project_users for their projects
-- Fixed to properly check auth_id against profile id
CREATE POLICY "Contractors can add users to their projects"
  ON project_users
  FOR INSERT
  WITH CHECK (
    project_id IN (
      SELECT p.id FROM projects p
      JOIN users u ON p.contractor_user_id = u.id
      WHERE u.auth_id = auth.uid()
    )
  );

-- Policy: Contractors can update project_users for their projects
CREATE POLICY "Contractors can update users in their projects"
  ON project_users
  FOR UPDATE
  USING (
    project_id IN (
      SELECT p.id FROM projects p
      JOIN users u ON p.contractor_user_id = u.id
      WHERE u.auth_id = auth.uid()
    )
  );

-- Policy: Contractors can delete project_users from their projects
CREATE POLICY "Contractors can remove users from their projects"
  ON project_users
  FOR DELETE
  USING (
    project_id IN (
      SELECT p.id FROM projects p
      JOIN users u ON p.contractor_user_id = u.id
      WHERE u.auth_id = auth.uid()
    )
  );

-- Add a comment explaining the fix
COMMENT ON TABLE project_users IS 'Manages user assignments to projects with roles and permissions. RLS policies updated to properly handle auth_id vs profile id mapping.';
