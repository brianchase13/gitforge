-- Wiki pages table
CREATE TABLE IF NOT EXISTS wiki_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repository_id UUID NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  body_html TEXT,
  author_id UUID NOT NULL REFERENCES users(id),
  last_editor_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(repository_id, slug)
);

-- Index for fast lookup
CREATE INDEX IF NOT EXISTS idx_wiki_pages_repository ON wiki_pages(repository_id);
CREATE INDEX IF NOT EXISTS idx_wiki_pages_slug ON wiki_pages(repository_id, slug);

-- RLS Policies
ALTER TABLE wiki_pages ENABLE ROW LEVEL SECURITY;

-- Anyone can view wiki pages for public repositories
CREATE POLICY "Anyone can view wiki pages for public repos"
  ON wiki_pages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM repositories r
      WHERE r.id = wiki_pages.repository_id
      AND r.visibility = 'public'
    )
  );

-- Collaborators can view wiki pages for private repositories
CREATE POLICY "Collaborators can view wiki pages for private repos"
  ON wiki_pages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM repositories r
      LEFT JOIN repository_collaborators rc ON rc.repository_id = r.id
      WHERE r.id = wiki_pages.repository_id
      AND (r.owner_id = auth.uid() OR rc.user_id = auth.uid())
    )
  );

-- Any authenticated user with read access can create/edit wiki pages (open wiki model)
CREATE POLICY "Authenticated users can create wiki pages"
  ON wiki_pages FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM repositories r
      LEFT JOIN repository_collaborators rc ON rc.repository_id = r.id
      WHERE r.id = wiki_pages.repository_id
      AND (
        r.visibility = 'public'
        OR r.owner_id = auth.uid()
        OR rc.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Authenticated users can update wiki pages"
  ON wiki_pages FOR UPDATE
  USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM repositories r
      LEFT JOIN repository_collaborators rc ON rc.repository_id = r.id
      WHERE r.id = wiki_pages.repository_id
      AND (
        r.visibility = 'public'
        OR r.owner_id = auth.uid()
        OR rc.user_id = auth.uid()
      )
    )
  );

-- Only owners and maintainers can delete wiki pages
CREATE POLICY "Maintainers can delete wiki pages"
  ON wiki_pages FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM repositories r
      LEFT JOIN repository_collaborators rc ON rc.repository_id = r.id
      WHERE r.id = wiki_pages.repository_id
      AND (
        r.owner_id = auth.uid()
        OR (rc.user_id = auth.uid() AND rc.permission IN ('maintain', 'admin'))
      )
    )
  );
