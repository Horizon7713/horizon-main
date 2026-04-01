-- Add bundle_id column to messages table for grouping multiple messages into one bubble
ALTER TABLE messages ADD COLUMN bundle_id UUID;

-- Create index for better query performance when grouping by bundle_id
CREATE INDEX idx_messages_bundle_id ON messages(bundle_id);

-- Add comment explaining the column
COMMENT ON COLUMN messages.bundle_id IS 'Groups multiple message rows (text + files) into a single message bubble';
