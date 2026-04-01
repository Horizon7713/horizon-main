-- Create project_invitations table for managing project invitations
CREATE TABLE IF NOT EXISTS project_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    invited_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    name TEXT,
    role_in_project TEXT NOT NULL,
    permissions JSONB DEFAULT '[]'::jsonb,
    token UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    accepted_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days')
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_project_invitations_project_id ON project_invitations(project_id);
CREATE INDEX IF NOT EXISTS idx_project_invitations_email ON project_invitations(email);
CREATE INDEX IF NOT EXISTS idx_project_invitations_token ON project_invitations(token);
CREATE INDEX IF NOT EXISTS idx_project_invitations_status ON project_invitations(status);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_project_invitations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER project_invitations_updated_at
    BEFORE UPDATE ON project_invitations
    FOR EACH ROW
    EXECUTE FUNCTION update_project_invitations_updated_at();

-- Enable Row Level Security
ALTER TABLE project_invitations ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Contractors can view invitations for their projects
CREATE POLICY "Contractors can view invitations for their projects"
    ON project_invitations
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM projects
            WHERE projects.id = project_invitations.project_id
            AND projects.contractor_user_id = auth.uid()
        )
    );

-- Contractors can create invitations for their projects
CREATE POLICY "Contractors can create invitations for their projects"
    ON project_invitations
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM projects
            WHERE projects.id = project_invitations.project_id
            AND projects.contractor_user_id = auth.uid()
        )
    );

-- Contractors can update invitations for their projects
CREATE POLICY "Contractors can update invitations for their projects"
    ON project_invitations
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM projects
            WHERE projects.id = project_invitations.project_id
            AND projects.contractor_user_id = auth.uid()
        )
    );

-- Contractors can delete invitations for their projects
CREATE POLICY "Contractors can delete invitations for their projects"
    ON project_invitations
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM projects
            WHERE projects.id = project_invitations.project_id
            AND projects.contractor_user_id = auth.uid()
        )
    );

-- Users can view invitations sent to their email
CREATE POLICY "Users can view invitations sent to their email"
    ON project_invitations
    FOR SELECT
    USING (
        email = (SELECT email FROM auth.users WHERE id = auth.uid())
    );

-- Users can update invitations sent to their email (to accept them)
CREATE POLICY "Users can update their own invitations"
    ON project_invitations
    FOR UPDATE
    USING (
        email = (SELECT email FROM auth.users WHERE id = auth.uid())
    );

-- Add comment for documentation
COMMENT ON TABLE project_invitations IS 'Stores project invitations sent to users before they join a project';
