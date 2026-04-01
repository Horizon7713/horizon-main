-- Insert Murphy Built company
INSERT INTO companies (name)
VALUES ('Murphy Built')
ON CONFLICT (name) DO NOTHING;
