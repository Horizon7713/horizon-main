-- Create bids_breakdown table with correct RLS policies
CREATE TABLE IF NOT EXISTS bids_breakdown (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bid_id UUID NOT NULL REFERENCES bids(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT,
  quantity NUMERIC NOT NULL DEFAULT 1,
  price NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE bids_breakdown ENABLE ROW LEVEL SECURITY;

-- RLS Policies with correct projects.users array reference
CREATE POLICY "Users can view breakdown items for bids on their projects"
ON bids_breakdown FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM bids b
    JOIN projects p ON b.project_id = p.id
    WHERE b.id = bids_breakdown.bid_id
    AND auth.uid() = ANY(p.users)
  )
);

CREATE POLICY "Users can insert breakdown items for their own bids"
ON bids_breakdown FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM bids
    WHERE bids.id = bids_breakdown.bid_id
    AND bids.uploaded_by = auth.uid()
  )
);

CREATE POLICY "Users can update their own bid breakdown items"
ON bids_breakdown FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM bids
    WHERE bids.id = bids_breakdown.bid_id
    AND bids.uploaded_by = auth.uid()
  )
);

CREATE POLICY "Users can delete their own bid breakdown items"
ON bids_breakdown FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM bids
    WHERE bids.id = bids_breakdown.bid_id
    AND bids.uploaded_by = auth.uid()
  )
);

-- Create trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_bids_breakdown_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_bids_breakdown_timestamp
BEFORE UPDATE ON bids_breakdown
FOR EACH ROW
EXECUTE FUNCTION update_bids_breakdown_updated_at();

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_bids_breakdown_bid_id ON bids_breakdown(bid_id);
