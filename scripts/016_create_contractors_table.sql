-- Create contractors table
CREATE TABLE IF NOT EXISTS public.contractors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  company TEXT NOT NULL,
  employees INTEGER DEFAULT 0,
  phone TEXT,
  email TEXT,
  address TEXT,
  license_number TEXT,
  insurance_info TEXT,
  specialization TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(contractor_user_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_contractors_user_id ON public.contractors(contractor_user_id);

-- Enable Row Level Security
ALTER TABLE public.contractors ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view all contractors"
  ON public.contractors
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert their own contractor profile"
  ON public.contractors
  FOR INSERT
  TO authenticated
  WITH CHECK (contractor_user_id = auth.uid());

CREATE POLICY "Users can update their own contractor profile"
  ON public.contractors
  FOR UPDATE
  TO authenticated
  USING (contractor_user_id = auth.uid())
  WITH CHECK (contractor_user_id = auth.uid());

CREATE POLICY "Users can delete their own contractor profile"
  ON public.contractors
  FOR DELETE
  TO authenticated
  USING (contractor_user_id = auth.uid());
