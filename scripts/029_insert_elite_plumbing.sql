-- Insert Elite Plumbing into companies table
INSERT INTO companies (name)
VALUES ('Elite Plumbing')
ON CONFLICT (name) DO NOTHING;
