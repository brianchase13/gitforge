-- Reactions table for issues, pull requests, and comments
CREATE TABLE IF NOT EXISTS reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reactable_type TEXT NOT NULL CHECK (reactable_type IN ('issue', 'pull_request', 'comment')),
  reactable_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reaction TEXT NOT NULL CHECK (reaction IN ('+1', '-1', 'laugh', 'hooray', 'confused', 'heart', 'rocket', 'eyes')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(reactable_type, reactable_id, user_id, reaction)
);

-- Index for fast lookup
CREATE INDEX IF NOT EXISTS idx_reactions_reactable ON reactions(reactable_type, reactable_id);
CREATE INDEX IF NOT EXISTS idx_reactions_user ON reactions(user_id);

-- RLS Policies
ALTER TABLE reactions ENABLE ROW LEVEL SECURITY;

-- Anyone can view reactions
CREATE POLICY "Anyone can view reactions"
  ON reactions FOR SELECT
  USING (true);

-- Authenticated users can add reactions
CREATE POLICY "Authenticated users can add reactions"
  ON reactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can remove their own reactions
CREATE POLICY "Users can remove their own reactions"
  ON reactions FOR DELETE
  USING (auth.uid() = user_id);
