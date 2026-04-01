-- Add mime_type column to messages table to store file MIME types
ALTER TABLE messages ADD COLUMN IF NOT EXISTS mime_type VARCHAR(255);

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_messages_mime_type ON messages(mime_type);

-- Add comment
COMMENT ON COLUMN messages.mime_type IS 'MIME type of the file attachment (e.g., image/png, video/mp4, application/pdf)';
