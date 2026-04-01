-- Insert contractor with specified values
INSERT INTO public.contractors (
  contractor_user_id,
  company,
  employees
) VALUES (
  'faa85fbd-1fa9-465d-8dda-868fa8313311'::uuid,
  '7da160b2-ed7a-48cc-b72c-528f88b7d008'::uuid,
  '["678a4937-d93d-459f-b084-4ac5bbe581ad"]'::jsonb
)
ON CONFLICT (contractor_user_id) DO UPDATE SET
  company = EXCLUDED.company,
  employees = EXCLUDED.employees,
  updated_at = NOW();
