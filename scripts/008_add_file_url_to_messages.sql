-- Add file_url column to messages table to support sending text and files together
ALTER TABLE messages ADD COLUMN IF NOT EXISTS file_url TEXT;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_messages_file_url ON messages(file_url) WHERE file_url IS NOT NULL;

-- Add comment
COMMENT ON COLUMN messages.file_url IS 'URL of attached file from Vercel Blob storage';
