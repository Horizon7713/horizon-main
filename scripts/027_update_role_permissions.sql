-- Update role permissions with sidebar navigation access
-- This defines which pages each role can access

UPDATE public.roles
SET permissions = jsonb_build_object(
  'dashboard', true,
  'messages', true,
  'project_management', true
)
WHERE name = 'contractor';

UPDATE public.roles
SET permissions = jsonb_build_object(
  'dashboard', true,
  'messages', true,
  'project_management', true
)
WHERE name = 'subcontractor';

UPDATE public.roles
SET permissions = jsonb_build_object(
  'dashboard', false,
  'messages', true,
  'project_management', false
)
WHERE name = 'employee';

UPDATE public.roles
SET permissions = jsonb_build_object(
  'dashboard', true,
  'messages', false,
  'project_management', false
)
WHERE name = 'homeowner';

-- Add comment explaining the permissions structure
COMMENT ON COLUMN roles.permissions IS 'JSONB object with page access permissions: {dashboard: boolean, messages: boolean, project_management: boolean}';
