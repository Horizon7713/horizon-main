-- Create timecards table to store timecard submissions
CREATE TABLE IF NOT EXISTS timecards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  work_type TEXT NOT NULL,
  notes TEXT,
  message_bundle UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_timecards_project_id ON timecards(project_id);
CREATE INDEX IF NOT EXISTS idx_timecards_uploaded_by ON timecards(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_timecards_message_bundle ON timecards(message_bundle);

-- Enable Row Level Security
ALTER TABLE timecards ENABLE ROW LEVEL SECURITY;

-- Create policies for timecards
CREATE POLICY "Users can view timecards for their projects" ON timecards
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own timecards" ON timecards
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their own timecards" ON timecards
  FOR UPDATE USING (uploaded_by = auth.uid());

CREATE POLICY "Users can delete their own timecards" ON timecards
  FOR DELETE USING (uploaded_by = auth.uid());

COMMENT ON TABLE timecards IS 'Stores timecard submissions linked to projects and messages';
