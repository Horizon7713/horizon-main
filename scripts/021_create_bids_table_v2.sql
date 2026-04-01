-- Create bids table with specified columns
CREATE TABLE IF NOT EXISTS bids (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  total_price DECIMAL(10, 2),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_bids_project_id ON bids(project_id);
CREATE INDEX IF NOT EXISTS idx_bids_uploaded_by ON bids(uploaded_by);

-- Enable Row Level Security
ALTER TABLE bids ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view all bids for projects they have access to
CREATE POLICY "Users can view bids for their projects"
  ON bids
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = bids.project_id
    )
  );

-- Policy: Users can insert their own bids
CREATE POLICY "Users can create bids"
  ON bids
  FOR INSERT
  WITH CHECK (uploaded_by = auth.uid());

-- Policy: Users can update their own bids
CREATE POLICY "Users can update their own bids"
  ON bids
  FOR UPDATE
  USING (uploaded_by = auth.uid())
  WITH CHECK (uploaded_by = auth.uid());

-- Policy: Users can delete their own bids
CREATE POLICY "Users can delete their own bids"
  ON bids
  FOR DELETE
  USING (uploaded_by = auth.uid());
