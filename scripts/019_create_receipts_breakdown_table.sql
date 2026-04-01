-- Create receipts_breakdown table for storing line items of receipts
CREATE TABLE IF NOT EXISTS receipts_breakdown (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_id UUID NOT NULL REFERENCES receipts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT,
  quantity DECIMAL(10, 2) NOT NULL DEFAULT 1,
  price DECIMAL(12, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on receipt_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_receipts_breakdown_receipt_id ON receipts_breakdown(receipt_id);

-- Enable Row Level Security
ALTER TABLE receipts_breakdown ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view all receipt breakdowns
CREATE POLICY "Users can view all receipt breakdowns"
  ON receipts_breakdown
  FOR SELECT
  TO authenticated
  USING (true);

-- RLS Policy: Users can insert breakdown items for receipts they uploaded
CREATE POLICY "Users can insert breakdown items for their receipts"
  ON receipts_breakdown
  FOR INSERT
  TO authenticated
  WITH CHECK (
    receipt_id IN (
      SELECT r.id FROM receipts r
      JOIN users u ON r.uploaded_by = u.id
      WHERE u.auth_id = auth.uid()
    )
  );

-- RLS Policy: Users can update breakdown items for receipts they uploaded
CREATE POLICY "Users can update breakdown items for their receipts"
  ON receipts_breakdown
  FOR UPDATE
  TO authenticated
  USING (
    receipt_id IN (
      SELECT r.id FROM receipts r
      JOIN users u ON r.uploaded_by = u.id
      WHERE u.auth_id = auth.uid()
    )
  );

-- RLS Policy: Users can delete breakdown items for receipts they uploaded
CREATE POLICY "Users can delete breakdown items for their receipts"
  ON receipts_breakdown
  FOR DELETE
  TO authenticated
  USING (
    receipt_id IN (
      SELECT r.id FROM receipts r
      JOIN users u ON r.uploaded_by = u.id
      WHERE u.auth_id = auth.uid()
    )
  );

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_receipts_breakdown_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_receipts_breakdown_updated_at
  BEFORE UPDATE ON receipts_breakdown
  FOR EACH ROW
  EXECUTE FUNCTION update_receipts_breakdown_updated_at();
