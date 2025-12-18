-- ============================================================================
-- RELEASES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS releases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  repository_id UUID NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
  tag_name TEXT NOT NULL,
  target_commitish TEXT NOT NULL DEFAULT 'main',
  name TEXT,
  body TEXT,
  body_html TEXT,
  draft BOOLEAN DEFAULT FALSE,
  prerelease BOOLEAN DEFAULT FALSE,
  author_id UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  published_at TIMESTAMPTZ,
  UNIQUE(repository_id, tag_name)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_releases_repo ON releases(repository_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_releases_tag ON releases(repository_id, tag_name);

-- Enable RLS
ALTER TABLE releases ENABLE ROW LEVEL SECURITY;

-- Releases on public repos are viewable by everyone
CREATE POLICY "Releases on public repos are viewable" ON releases
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM repositories
      WHERE id = releases.repository_id
      AND visibility = 'public'
    )
  );

-- Users with write access can create releases
CREATE POLICY "Users can create releases" ON releases
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM repositories
      WHERE id = releases.repository_id
      AND (
        (owner_type = 'user' AND owner_id = auth.uid()) OR
        EXISTS (
          SELECT 1 FROM repository_collaborators
          WHERE repository_id = releases.repository_id
          AND user_id = auth.uid()
          AND permission IN ('write', 'maintain', 'admin')
        )
      )
    )
  );

-- Authors can update their releases
CREATE POLICY "Authors can update releases" ON releases
  FOR UPDATE USING (
    author_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM repositories
      WHERE id = releases.repository_id
      AND owner_type = 'user'
      AND owner_id = auth.uid()
    )
  );

-- Authors and owners can delete releases
CREATE POLICY "Authors can delete releases" ON releases
  FOR DELETE USING (
    author_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM repositories
      WHERE id = releases.repository_id
      AND owner_type = 'user'
      AND owner_id = auth.uid()
    )
  );
