-- Create media table to store project media files (images and videos)
CREATE TABLE IF NOT EXISTS media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  caption TEXT,
  message_bundle UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_media_project_id ON media(project_id);
CREATE INDEX IF NOT EXISTS idx_media_uploaded_by ON media(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_media_created_at ON media(created_at DESC);

-- Enable Row Level Security
ALTER TABLE media ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Allow users to view media for projects they have access to
CREATE POLICY "Users can view media for their projects"
  ON media FOR SELECT
  USING (
    project_id IN (
      SELECT id FROM projects 
      WHERE contractor_user_id = (SELECT id FROM users WHERE auth_id = auth.uid())
      OR (SELECT id FROM users WHERE auth_id = auth.uid()) = ANY(users)
    )
  );

-- Allow users to insert media for projects they have access to
CREATE POLICY "Users can insert media for their projects"
  ON media FOR INSERT
  WITH CHECK (
    project_id IN (
      SELECT id FROM projects 
      WHERE contractor_user_id = (SELECT id FROM users WHERE auth_id = auth.uid())
      OR (SELECT id FROM users WHERE auth_id = auth.uid()) = ANY(users)
    )
  );

-- Allow users to update their own media
CREATE POLICY "Users can update their own media"
  ON media FOR UPDATE
  USING (uploaded_by = (SELECT id FROM users WHERE auth_id = auth.uid()));

-- Allow users to delete their own media
CREATE POLICY "Users can delete their own media"
  ON media FOR DELETE
  USING (uploaded_by = (SELECT id FROM users WHERE auth_id = auth.uid()));

COMMENT ON TABLE media IS 'Stores media files (images and videos) uploaded to projects';
