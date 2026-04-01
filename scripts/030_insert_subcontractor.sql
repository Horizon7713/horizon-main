-- Insert subcontractor record
INSERT INTO subcontractors (
  subcontractor_user_id,
  contractor_id,
  company,
  employees,
  employees_count
)
VALUES (
  'ef3a8af3-c28b-43c6-b2b3-b28f0d592b50',
  '3a5c8226-898d-400b-a6b0-7418b38b6e1e',
  '7d391295-3514-4e05-a6be-cc1d6a340338',
  '[]'::jsonb,
  0
)
ON CONFLICT (subcontractor_user_id) 
DO UPDATE SET
  contractor_id = EXCLUDED.contractor_id,
  company = EXCLUDED.company,
  updated_at = NOW();
