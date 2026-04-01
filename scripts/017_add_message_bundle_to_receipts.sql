-- Add message_bundle column to receipts table
ALTER TABLE receipts
ADD COLUMN message_bundle UUID;

-- Add index for better query performance
CREATE INDEX idx_receipts_message_bundle ON receipts(message_bundle);

-- Add comment to describe the column
COMMENT ON COLUMN receipts.message_bundle IS 'Links receipt to a message bundle ID for grouping related messages';
