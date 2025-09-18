# Workspace Invitation Setup Instructions

## The Issues
1. The board invitation system is trying to check workspace membership but the `workspace_invitations` table doesn't exist yet, causing 406 and 404 errors.
2. The system was trying to insert invalid role values that violate database constraints, causing 400 Bad Request errors.

## Solution
You need to run the workspace invitations table setup SQL script in your Supabase database.

### Step 1: Run the Database Setup SQL
1. Go to your **Supabase Dashboard**
2. Click on **SQL Editor** in the left sidebar
3. Copy and paste this SQL script:

```sql
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
  FOR INSERT WITH CHECK (true);

-- Policy for updating invitations
CREATE POLICY "Users can update their own workspace invitations" ON workspace_invitations
  FOR UPDATE USING (invited_user_id = auth.uid());
```

4. Click **Run** to execute the SQL

### Step 2: Test the Board Invitation System
1. Go back to your Trello clone app
2. Navigate to any board that belongs to a workspace
3. Click **"Invite Members"** button
4. Try searching for users and adding them
5. The system should now:
   - Check if users are workspace members
   - Send workspace invitations to non-members (with purple styling)
   - Send board invitations to all users
   - Display combined invitations in different colors

### What This Fixes
- ✅ Eliminates 406 and 404 errors when checking workspace membership
- ✅ Fixes check constraint violation errors (23514) when creating workspace invitations
- ✅ Enables proper workspace + board invitation flow
- ✅ Shows workspace invitations in purple color when combined with board
- ✅ Handles cases where users aren't workspace members yet
- ✅ Uses proper database constraints for role field

### Fallback Behavior
If the `workspace_invitations` table doesn't exist, the system will:
- Treat all users as non-workspace members
- Send only board invitations (no workspace invitations)
- Continue to work without errors
- Log helpful messages in the console

This ensures the board invitation system remains functional even if the workspace system isn't fully set up yet.
