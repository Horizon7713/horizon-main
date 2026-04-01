-- Create users table with specified columns
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name VARCHAR(255) NOT NULL,
  last_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  company VARCHAR(255),
  role VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Create index on company for filtering
CREATE INDEX IF NOT EXISTS idx_users_company ON users(company);

-- Add comment to table
COMMENT ON TABLE users IS 'Stores user account information for Horizon platform';

-- Note: In production, passwords should be hashed using bcrypt or similar before storage
-- Consider using Supabase Auth instead of managing passwords directly
