-- Create plan_viewer table for storing PDF markups
CREATE TABLE IF NOT EXISTS plan_viewer (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES pdf_files(id) ON DELETE CASCADE,
  page_number INT NOT NULL,
  markup_json JSONB NOT NULL,
  author_id UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'archived', 'deleted')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE plan_viewer ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view plan_viewer entries"
  ON plan_viewer FOR SELECT
  USING (TRUE);

CREATE POLICY "Users can create plan_viewer entries"
  ON plan_viewer FOR INSERT
  WITH CHECK (author_id = auth.uid());

CREATE POLICY "Users can update their own plan_viewer entries"
  ON plan_viewer FOR UPDATE
  USING (author_id = auth.uid());

CREATE POLICY "Users can delete their own plan_viewer entries"
  ON plan_viewer FOR DELETE
  USING (author_id = auth.uid());

-- Create indexes for performance
CREATE INDEX idx_plan_viewer_document_id ON plan_viewer(document_id);
CREATE INDEX idx_plan_viewer_page_number ON plan_viewer(page_number);
CREATE INDEX idx_plan_viewer_author_id ON plan_viewer(author_id);
CREATE INDEX idx_plan_viewer_status ON plan_viewer(status);
CREATE INDEX idx_plan_viewer_created_at ON plan_viewer(created_at);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE plan_viewer;
