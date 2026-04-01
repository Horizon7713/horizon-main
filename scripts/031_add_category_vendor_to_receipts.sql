-- Add category and vender_name columns to receipts table
ALTER TABLE receipts
ADD COLUMN IF NOT EXISTS category TEXT,
ADD COLUMN IF NOT EXISTS vender_name TEXT;

-- Create index on category for faster filtering
CREATE INDEX IF NOT EXISTS idx_receipts_category ON receipts(category);

-- Create index on vender_name for faster searching
CREATE INDEX IF NOT EXISTS idx_receipts_vender_name ON receipts(vender_name);
