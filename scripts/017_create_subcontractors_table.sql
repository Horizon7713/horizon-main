-- Create subcontractors table
CREATE TABLE IF NOT EXISTS public.subcontractors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subcontractor_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  contractor_id UUID REFERENCES public.contractors(id) ON DELETE SET NULL,
  company TEXT NOT NULL,
  employees INTEGER DEFAULT 0,
  phone TEXT,
  email TEXT,
  address TEXT,
  license_number TEXT,
  insurance_info TEXT,
  specialization TEXT,
  hourly_rate NUMERIC(10, 2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(subcontractor_user_id)
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_subcontractors_user_id ON public.subcontractors(subcontractor_user_id);
CREATE INDEX IF NOT EXISTS idx_subcontractors_contractor_id ON public.subcontractors(contractor_id);

-- Enable Row Level Security
ALTER TABLE public.subcontractors ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view all subcontractors"
  ON public.subcontractors
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert their own subcontractor profile"
  ON public.subcontractors
  FOR INSERT
  TO authenticated
  WITH CHECK (subcontractor_user_id = auth.uid());

CREATE POLICY "Users can update their own subcontractor profile"
  ON public.subcontractors
  FOR UPDATE
  TO authenticated
  USING (subcontractor_user_id = auth.uid())
  WITH CHECK (subcontractor_user_id = auth.uid());

CREATE POLICY "Contractors can update their subcontractors"
  ON public.subcontractors
  FOR UPDATE
  TO authenticated
  USING (
    contractor_id IN (
      SELECT id FROM public.contractors WHERE contractor_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own subcontractor profile"
  ON public.subcontractors
  FOR DELETE
  TO authenticated
  USING (subcontractor_user_id = auth.uid());
