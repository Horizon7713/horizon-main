-- Create page_scales table for storing per-page measurement scales
CREATE TABLE IF NOT EXISTS public.page_scales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL,
  page_number INTEGER NOT NULL,
  inches_per_pixel DOUBLE PRECISION NOT NULL,
  scale_label TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (document_id, page_number)
);

-- Enable RLS
ALTER TABLE public.page_scales ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view page scales" ON public.page_scales
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create page scales" ON public.page_scales
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update page scales" ON public.page_scales
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete page scales" ON public.page_scales
  FOR DELETE USING (auth.uid() IS NOT NULL);
