-- Run this SQL in your Supabase SQL Editor to create card members table

-- Create card_members table
CREATE TABLE IF NOT EXISTS card_members (
  id SERIAL PRIMARY KEY,
  card_id INTEGER NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  added_by_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  UNIQUE(card_id, user_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_card_members_card_id ON card_members(card_id);
CREATE INDEX IF NOT EXISTS idx_card_members_user_id ON card_members(user_id);
CREATE INDEX IF NOT EXISTS idx_card_members_added_by ON card_members(added_by_user_id);

-- Disable Row Level Security (unrestricted access)
ALTER TABLE card_members DISABLE ROW LEVEL SECURITY;

-- Function to check if user can drag a card
CREATE OR REPLACE FUNCTION can_user_drag_card(card_id_param INTEGER, user_id_param UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if user is a member of the card
  RETURN EXISTS (
    SELECT 1 FROM card_members 
    WHERE card_id = card_id_param AND user_id = user_id_param
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
