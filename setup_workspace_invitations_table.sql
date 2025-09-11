-- Run this SQL in your Supabase SQL Editor to create workspace invitations table

-- Create workspace_invitations table
CREATE TABLE IF NOT EXISTS workspace_invitations (
  id SERIAL PRIMARY KEY,
  workspace_id INTEGER NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  invited_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invited_by_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  responded_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(workspace_id, invited_user_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_workspace_invitations_invited_user ON workspace_invitations(invited_user_id);
CREATE INDEX IF NOT EXISTS idx_workspace_invitations_workspace_id ON workspace_invitations(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_invitations_status ON workspace_invitations(status);

-- Enable Row Level Security
ALTER TABLE workspace_invitations ENABLE ROW LEVEL SECURITY;

-- Temporarily disable RLS for testing (remove this in production)
ALTER TABLE workspace_invitations DISABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist, then create new ones
DROP POLICY IF EXISTS "Users can view their own workspace invitations" ON workspace_invitations;
DROP POLICY IF EXISTS "Users can create workspace invitations" ON workspace_invitations;
DROP POLICY IF EXISTS "Users can update their own workspace invitations" ON workspace_invitations;

-- Create RLS policies for workspace invitations
CREATE POLICY "Users can view their own workspace invitations" ON workspace_invitations
  FOR SELECT USING (invited_user_id = auth.uid());

-- More permissive policy for creating invitations - allow any authenticated user to create invitations
CREATE POLICY "Users can create workspace invitations" ON workspace_invitations
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their own workspace invitations" ON workspace_invitations
  FOR UPDATE USING (invited_user_id = auth.uid());

-- Function to handle workspace invitation acceptance
CREATE OR REPLACE FUNCTION accept_workspace_invitation(invitation_id INTEGER)
RETURNS BOOLEAN AS $$
DECLARE
  invitation_record RECORD;
BEGIN
  -- Get the invitation details
  SELECT * INTO invitation_record 
  FROM workspace_invitations 
  WHERE id = invitation_id AND invited_user_id = auth.uid() AND status = 'pending';
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Update invitation status
  UPDATE workspace_invitations 
  SET status = 'accepted', responded_at = NOW() 
  WHERE id = invitation_id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

