-- Update contractors table to use proper foreign keys for company and employees

-- First, drop the old company column and add a new one with UUID type
ALTER TABLE public.contractors 
  DROP COLUMN IF EXISTS company,
  ADD COLUMN company UUID REFERENCES public.companies(id) ON DELETE SET NULL;

-- Change employees from INTEGER to JSONB array to store employee user IDs
ALTER TABLE public.contractors 
  DROP COLUMN IF EXISTS employees,
  ADD COLUMN employees JSONB DEFAULT '[]'::jsonb;

-- Add index for company lookups
CREATE INDEX IF NOT EXISTS idx_contractors_company ON public.contractors(company);

-- Add comment to explain the employees column structure
COMMENT ON COLUMN public.contractors.employees IS 'Array of employee user IDs stored as JSONB';
