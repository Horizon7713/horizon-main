-- Create PDF files table
CREATE TABLE pdf_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size_bytes INTEGER,
  page_count INTEGER,
  uploaded_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create markups table (stores all markup objects)
CREATE TABLE pdf_markups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pdf_file_id UUID NOT NULL REFERENCES pdf_files(id) ON DELETE CASCADE,
  page_number INTEGER NOT NULL,
  markup_type TEXT NOT NULL CHECK (markup_type IN ('line', 'rectangle', 'ellipse', 'text', 'polyline', 'freehand')),
  markup_data JSONB NOT NULL, -- Stores coordinates, color, thickness, text content, etc.
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create markup sessions table (tracks who has file open)
CREATE TABLE pdf_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pdf_file_id UUID NOT NULL REFERENCES pdf_files(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_active TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on all tables
ALTER TABLE pdf_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE pdf_markups ENABLE ROW LEVEL SECURITY;
ALTER TABLE pdf_sessions ENABLE ROW LEVEL SECURITY;

-- RLS policies for pdf_files
CREATE POLICY "Users can view PDF files in their projects"
  ON pdf_files FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM project_users
      WHERE project_users.project_id = pdf_files.project_id
      AND project_users.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can upload PDF files to their projects"
  ON pdf_files FOR INSERT
  WITH CHECK (
    uploaded_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM project_users
      WHERE project_users.project_id = pdf_files.project_id
      AND project_users.user_id = auth.uid()
    )
  );

-- RLS policies for pdf_markups
CREATE POLICY "Users can view markups on PDFs they can access"
  ON pdf_markups FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM pdf_files pf
      JOIN project_users pu ON pu.project_id = pf.project_id
      WHERE pf.id = pdf_markups.pdf_file_id
      AND pu.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create markups on PDFs they can access"
  ON pdf_markups FOR INSERT
  WITH CHECK (
    created_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM pdf_files pf
      JOIN project_users pu ON pu.project_id = pf.project_id
      WHERE pf.id = pdf_markups.pdf_file_id
      AND pu.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own markups"
  ON pdf_markups FOR UPDATE
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can delete their own markups"
  ON pdf_markups FOR DELETE
  USING (created_by = auth.uid());

-- RLS policies for pdf_sessions
CREATE POLICY "Users can manage their own sessions"
  ON pdf_sessions FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Create indexes for performance
CREATE INDEX idx_pdf_files_project_id ON pdf_files(project_id);
CREATE INDEX idx_pdf_markups_pdf_file_id ON pdf_markups(pdf_file_id);
CREATE INDEX idx_pdf_markups_page_number ON pdf_markups(page_number);
CREATE INDEX idx_pdf_sessions_pdf_file_id ON pdf_sessions(pdf_file_id);
CREATE INDEX idx_pdf_sessions_user_id ON pdf_sessions(user_id);
