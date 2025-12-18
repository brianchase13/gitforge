-- Gists table
CREATE TABLE IF NOT EXISTS gists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  description TEXT,
  visibility TEXT DEFAULT 'public' CHECK (visibility IN ('public', 'secret')),
  files_count INTEGER DEFAULT 0,
  forks_count INTEGER DEFAULT 0,
  stars_count INTEGER DEFAULT 0,
  forked_from_id UUID REFERENCES gists(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Gist files table
CREATE TABLE IF NOT EXISTS gist_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gist_id UUID NOT NULL REFERENCES gists(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  content TEXT NOT NULL,
  language TEXT,
  size_bytes INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(gist_id, filename)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_gists_author ON gists(author_id);
CREATE INDEX IF NOT EXISTS idx_gists_visibility ON gists(visibility);
CREATE INDEX IF NOT EXISTS idx_gists_created ON gists(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_gist_files_gist ON gist_files(gist_id);

-- RLS Policies
ALTER TABLE gists ENABLE ROW LEVEL SECURITY;
ALTER TABLE gist_files ENABLE ROW LEVEL SECURITY;

-- Anyone can view public gists
CREATE POLICY "Anyone can view public gists"
  ON gists FOR SELECT
  USING (visibility = 'public');

-- Users can view their own gists (including secret)
CREATE POLICY "Users can view own gists"
  ON gists FOR SELECT
  USING (author_id = auth.uid());

-- Users can create gists
CREATE POLICY "Users can create gists"
  ON gists FOR INSERT
  WITH CHECK (author_id = auth.uid());

-- Users can update their own gists
CREATE POLICY "Users can update own gists"
  ON gists FOR UPDATE
  USING (author_id = auth.uid());

-- Users can delete their own gists
CREATE POLICY "Users can delete own gists"
  ON gists FOR DELETE
  USING (author_id = auth.uid());

-- Gist files policies follow parent gist
CREATE POLICY "Anyone can view files of public gists"
  ON gist_files FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM gists g
      WHERE g.id = gist_files.gist_id
      AND g.visibility = 'public'
    )
  );

CREATE POLICY "Users can view files of own gists"
  ON gist_files FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM gists g
      WHERE g.id = gist_files.gist_id
      AND g.author_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage files of own gists"
  ON gist_files FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM gists g
      WHERE g.id = gist_files.gist_id
      AND g.author_id = auth.uid()
    )
  );
