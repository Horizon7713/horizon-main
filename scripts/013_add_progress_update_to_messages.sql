-- Add progress_update column to messages table
ALTER TABLE messages
ADD COLUMN progress_update VARCHAR(255);

-- Add index for better query performance
CREATE INDEX idx_messages_progress_update ON messages(progress_update);

-- Add comment to document the column
COMMENT ON COLUMN messages.progress_update IS 'Stores work progress type for timecard messages (e.g., Framing, Concrete)';
