-- PDF Collaboration Tables for Real-time Markup Sharing

-- PDF Sessions: Track who has PDFs open
CREATE TABLE IF NOT EXISTS pdf_sessions_collaboration (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pdf_file_id UUID NOT NULL REFERENCES pdf_files(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE,
  viewport_x FLOAT DEFAULT 0,
  viewport_y FLOAT DEFAULT 0,
  zoom_level FLOAT DEFAULT 1,
  current_page INT DEFAULT 1,
  UNIQUE(pdf_file_id, user_id)
);

-- Markup Versions: Audit trail for all markup changes
CREATE TABLE IF NOT EXISTS pdf_markup_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  markup_id UUID NOT NULL REFERENCES pdf_markups(id) ON DELETE CASCADE,
  version_number INT NOT NULL,
  changed_by UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  change_type VARCHAR(20) CHECK (change_type IN ('created', 'modified', 'deleted')),
  previous_data JSONB,
  new_data JSONB NOT NULL,
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(markup_id, version_number)
);

-- Markup Comments: Real-time discussion on markups
CREATE TABLE IF NOT EXISTS pdf_markup_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  markup_id UUID NOT NULL REFERENCES pdf_markups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_resolved BOOLEAN DEFAULT FALSE
);

-- Markup Assignments: Track who's responsible for each markup
CREATE TABLE IF NOT EXISTS pdf_markup_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  markup_id UUID NOT NULL REFERENCES pdf_markups(id) ON DELETE CASCADE,
  assigned_to UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assigned_by UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  due_date TIMESTAMP WITH TIME ZONE,
  UNIQUE(markup_id, assigned_to)
);

-- Enable RLS
ALTER TABLE pdf_sessions_collaboration ENABLE ROW LEVEL SECURITY;
ALTER TABLE pdf_markup_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE pdf_markup_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE pdf_markup_assignments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for PDF Sessions
CREATE POLICY "Users can view their own sessions"
  ON pdf_sessions_collaboration FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create sessions"
  ON pdf_sessions_collaboration FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own sessions"
  ON pdf_sessions_collaboration FOR UPDATE
  USING (user_id = auth.uid());

-- RLS Policies for Markup Versions
CREATE POLICY "Users can view markup versions"
  ON pdf_markup_versions FOR SELECT
  USING (TRUE);

CREATE POLICY "Users can create versions"
  ON pdf_markup_versions FOR INSERT
  WITH CHECK (changed_by = auth.uid());

-- RLS Policies for Markup Comments
CREATE POLICY "Users can view markup comments"
  ON pdf_markup_comments FOR SELECT
  USING (TRUE);

CREATE POLICY "Users can create comments"
  ON pdf_markup_comments FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own comments"
  ON pdf_markup_comments FOR UPDATE
  USING (user_id = auth.uid());

-- RLS Policies for Markup Assignments
CREATE POLICY "Users can view assignments"
  ON pdf_markup_assignments FOR SELECT
  USING (TRUE);

CREATE POLICY "Admins can create assignments"
  ON pdf_markup_assignments FOR INSERT
  WITH CHECK (assigned_by = auth.uid());

-- Create indexes for performance
CREATE INDEX idx_pdf_sessions_collaboration_pdf_file_id ON pdf_sessions_collaboration(pdf_file_id);
CREATE INDEX idx_pdf_sessions_collaboration_user_id ON pdf_sessions_collaboration(user_id);
CREATE INDEX idx_pdf_markup_versions_markup_id ON pdf_markup_versions(markup_id);
CREATE INDEX idx_pdf_markup_versions_changed_by ON pdf_markup_versions(changed_by);
CREATE INDEX idx_pdf_markup_comments_markup_id ON pdf_markup_comments(markup_id);
CREATE INDEX idx_pdf_markup_comments_user_id ON pdf_markup_comments(user_id);
CREATE INDEX idx_pdf_markup_assignments_markup_id ON pdf_markup_assignments(markup_id);
CREATE INDEX idx_pdf_markup_assignments_assigned_to ON pdf_markup_assignments(assigned_to);

-- Enable realtime for collaboration
ALTER PUBLICATION supabase_realtime ADD TABLE pdf_sessions_collaboration;
ALTER PUBLICATION supabase_realtime ADD TABLE pdf_markup_versions;
ALTER PUBLICATION supabase_realtime ADD TABLE pdf_markup_comments;
ALTER PUBLICATION supabase_realtime ADD TABLE pdf_markup_assignments;
