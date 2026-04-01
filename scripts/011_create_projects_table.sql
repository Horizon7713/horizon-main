-- Create projects table
CREATE TABLE IF NOT EXISTS public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  start_date DATE,
  end_date DATE,
  users UUID[] DEFAULT '{}', -- Array of user IDs from the users table
  company VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add check constraint to ensure end_date is after start_date
ALTER TABLE public.projects
ADD CONSTRAINT check_project_dates 
CHECK (end_date IS NULL OR start_date IS NULL OR end_date >= start_date);

-- Create index on status for faster filtering
CREATE INDEX IF NOT EXISTS idx_projects_status ON public.projects(status);

-- Create index on company for faster filtering
CREATE INDEX IF NOT EXISTS idx_projects_company ON public.projects(company);

-- Create index on users array for faster lookups
CREATE INDEX IF NOT EXISTS idx_projects_users ON public.projects USING GIN(users);

-- Disable RLS to avoid query issues (can be enabled later with proper policies)
ALTER TABLE public.projects DISABLE ROW LEVEL SECURITY;

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_projects_updated_at
BEFORE UPDATE ON public.projects
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE public.projects IS 'Projects table for managing project information';
COMMENT ON COLUMN public.projects.users IS 'Array of user IDs associated with this project';
COMMENT ON COLUMN public.projects.status IS 'Project status (e.g., active, completed, on-hold, cancelled)';
