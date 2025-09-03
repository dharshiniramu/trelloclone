-- Run this SQL in your Supabase SQL Editor to add members array and invitations to boards table

-- Add user_id column to boards table if it doesn't exist
ALTER TABLE boards ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- Add members array column to boards table
ALTER TABLE boards ADD COLUMN IF NOT EXISTS members JSONB DEFAULT '[]'::jsonb;

-- Add email column to profiles table if it doesn't exist
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email TEXT;

-- Create invitations table
CREATE TABLE IF NOT EXISTS board_invitations (
  id SERIAL PRIMARY KEY,
  board_id INTEGER NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  invited_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invited_by_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  responded_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(board_id, invited_user_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_boards_user_id ON boards(user_id);
CREATE INDEX IF NOT EXISTS idx_boards_members ON boards USING GIN (members);
CREATE INDEX IF NOT EXISTS idx_invitations_invited_user ON board_invitations(invited_user_id);
CREATE INDEX IF NOT EXISTS idx_invitations_board_id ON board_invitations(board_id);
CREATE INDEX IF NOT EXISTS idx_invitations_status ON board_invitations(status);

-- Enable Row Level Security
ALTER TABLE board_invitations ENABLE ROW LEVEL SECURITY;

-- Temporarily disable RLS for testing (remove this in production)
ALTER TABLE board_invitations DISABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist, then create new ones
DROP POLICY IF EXISTS "Users can view their own invitations" ON board_invitations;
DROP POLICY IF EXISTS "Users can create invitations" ON board_invitations;
DROP POLICY IF EXISTS "Users can update their own invitations" ON board_invitations;

-- Create RLS policies for invitations
CREATE POLICY "Users can view their own invitations" ON board_invitations
  FOR SELECT USING (invited_user_id = auth.uid());

-- More permissive policy for creating invitations - allow any authenticated user to create invitations
CREATE POLICY "Users can create invitations" ON board_invitations
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their own invitations" ON board_invitations
  FOR UPDATE USING (invited_user_id = auth.uid());

-- Function to automatically add board creator as owner in members array
CREATE OR REPLACE FUNCTION add_board_owner_to_members()
RETURNS TRIGGER AS $$
BEGIN
  -- Only add owner if user_id is provided
  IF NEW.user_id IS NOT NULL THEN
    -- Initialize members array if it's null
    IF NEW.members IS NULL THEN
      NEW.members := '[]'::jsonb;
    END IF;
    
    -- Add the creator as owner to the members array
    NEW.members := NEW.members || jsonb_build_object(
      'user_id', NEW.user_id,
      'role', 'owner',
      'added_at', NOW()
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically add board creator as owner
DROP TRIGGER IF EXISTS trigger_add_board_owner_to_members ON boards;
CREATE TRIGGER trigger_add_board_owner_to_members
  BEFORE INSERT ON boards
  FOR EACH ROW
  EXECUTE FUNCTION add_board_owner_to_members();

-- Function to handle invitation acceptance
CREATE OR REPLACE FUNCTION accept_board_invitation(invitation_id INTEGER)
RETURNS BOOLEAN AS $$
DECLARE
  invitation_record RECORD;
  board_members JSONB;
BEGIN
  -- Get the invitation details
  SELECT * INTO invitation_record 
  FROM board_invitations 
  WHERE id = invitation_id AND invited_user_id = auth.uid() AND status = 'pending';
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Get current board members
  SELECT members INTO board_members 
  FROM boards 
  WHERE id = invitation_record.board_id;
  
  -- Add the user to board members
  board_members := COALESCE(board_members, '[]'::jsonb) || jsonb_build_object(
    'user_id', invitation_record.invited_user_id,
    'role', invitation_record.role,
    'added_at', NOW()
  );
  
  -- Update board members
  UPDATE boards 
  SET members = board_members 
  WHERE id = invitation_record.board_id;
  
  -- Update invitation status
  UPDATE board_invitations 
  SET status = 'accepted', responded_at = NOW() 
  WHERE id = invitation_id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
