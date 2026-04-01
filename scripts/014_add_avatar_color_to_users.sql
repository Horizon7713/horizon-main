-- Add avatar_color column to users table
ALTER TABLE users ADD COLUMN avatar_color TEXT;

-- Add a check constraint to ensure only valid colors are used
ALTER TABLE users ADD CONSTRAINT avatar_color_check 
  CHECK (avatar_color IN ('blue', 'red', 'green', 'purple', 'pink') OR avatar_color IS NULL);

-- Set default color for existing users
UPDATE users SET avatar_color = 'blue' WHERE avatar_color IS NULL;
