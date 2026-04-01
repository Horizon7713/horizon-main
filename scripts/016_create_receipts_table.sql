-- Create receipts table
CREATE TABLE IF NOT EXISTS receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  uploaded_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  total_price DECIMAL(12, 2) NOT NULL,
  project UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on uploaded_by for faster queries
CREATE INDEX IF NOT EXISTS idx_receipts_uploaded_by ON receipts(uploaded_by);

-- Create index on project for faster queries
CREATE INDEX IF NOT EXISTS idx_receipts_project ON receipts(project);

-- Create index on created_at for sorting
CREATE INDEX IF NOT EXISTS idx_receipts_created_at ON receipts(created_at DESC);

-- Add RLS (Row Level Security) policies
ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view all receipts
CREATE POLICY "Users can view all receipts"
  ON receipts
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Users can insert their own receipts
CREATE POLICY "Users can insert their own receipts"
  ON receipts
  FOR INSERT
  TO authenticated
  WITH CHECK (uploaded_by = auth.uid());

-- Policy: Users can update their own receipts
CREATE POLICY "Users can update their own receipts"
  ON receipts
  FOR UPDATE
  TO authenticated
  USING (uploaded_by = auth.uid());

-- Policy: Users can delete their own receipts
CREATE POLICY "Users can delete their own receipts"
  ON receipts
  FOR DELETE
  TO authenticated
  USING (uploaded_by = auth.uid());
