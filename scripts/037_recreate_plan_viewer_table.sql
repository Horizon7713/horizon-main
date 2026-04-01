-- Recreate plan_viewer table with proper constraints that work with the upload flow
-- Drop existing table if it exists
DROP TABLE IF EXISTS plan_viewer CASCADE;

-- Create the plan_viewer table
CREATE TABLE plan_viewer (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL UNIQUE,
  page_number INTEGER DEFAULT 0,
  markup_json JSONB NOT NULL,
  author_id UUID NOT NULL,
  status VARCHAR(50) CHECK (status IN ('active', 'archived', 'deleted')) DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_plan_viewer_document_id ON plan_viewer(document_id);
CREATE INDEX idx_plan_viewer_author_id ON plan_viewer(author_id);
CREATE INDEX idx_plan_viewer_status ON plan_viewer(status);

-- Enable RLS
ALTER TABLE plan_viewer ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Allow any authenticated user to create/view/update their own records
CREATE POLICY "Users can create their own records"
  ON plan_viewer FOR INSERT
  WITH CHECK (author_id = auth.uid());

CREATE POLICY "Users can view all records"
  ON plan_viewer FOR SELECT
  USING (true);

CREATE POLICY "Users can update their own records"
  ON plan_viewer FOR UPDATE
  USING (author_id = auth.uid());

CREATE POLICY "Users can delete their own records"
  ON plan_viewer FOR DELETE
  USING (author_id = auth.uid());

-- Enable realtime for collaboration
ALTER PUBLICATION supabase_realtime ADD TABLE plan_viewer;
