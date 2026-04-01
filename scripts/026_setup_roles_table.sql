-- Setup roles table with public read access for signup page

-- Create roles table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL UNIQUE,
  permissions JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow public read access to roles" ON public.roles;
DROP POLICY IF EXISTS "Allow authenticated users to read roles" ON public.roles;

-- Create policy to allow anyone (including unauthenticated users) to read roles
-- This is necessary for the signup page to display role options
CREATE POLICY "Allow public read access to roles"
  ON public.roles
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Insert roles if they don't exist
INSERT INTO public.roles (name, permissions)
VALUES 
  ('employee', '[]'::jsonb),
  ('contractor', '[]'::jsonb),
  ('subcontractor', '[]'::jsonb),
  ('homeowner', '[]'::jsonb)
ON CONFLICT (name) DO NOTHING;

-- Create index on name for faster lookups
CREATE INDEX IF NOT EXISTS idx_roles_name ON public.roles(name);
