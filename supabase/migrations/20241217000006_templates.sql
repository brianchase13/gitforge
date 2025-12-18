-- Issue and PR templates table
CREATE TABLE IF NOT EXISTS templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repository_id UUID NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
  template_type TEXT NOT NULL CHECK (template_type IN ('issue', 'pull_request')),
  name TEXT NOT NULL,
  description TEXT,
  title_template TEXT,
  body TEXT NOT NULL,
  labels TEXT[] DEFAULT '{}',
  assignees TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(repository_id, template_type, name)
);

-- Index for fast lookup
CREATE INDEX IF NOT EXISTS idx_templates_repository ON templates(repository_id);
CREATE INDEX IF NOT EXISTS idx_templates_type ON templates(repository_id, template_type);

-- RLS Policies
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;

-- Anyone can view templates for public repositories
CREATE POLICY "Anyone can view templates for public repos"
  ON templates FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM repositories r
      WHERE r.id = templates.repository_id
      AND r.visibility = 'public'
    )
  );

-- Repository owners and collaborators can view templates for private repositories
CREATE POLICY "Collaborators can view templates for private repos"
  ON templates FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM repositories r
      LEFT JOIN repository_collaborators rc ON rc.repository_id = r.id
      WHERE r.id = templates.repository_id
      AND (r.owner_id = auth.uid() OR rc.user_id = auth.uid())
    )
  );

-- Repository owners and maintainers can create/update/delete templates
CREATE POLICY "Repository maintainers can manage templates"
  ON templates FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM repositories r
      LEFT JOIN repository_collaborators rc ON rc.repository_id = r.id
      WHERE r.id = templates.repository_id
      AND (
        r.owner_id = auth.uid()
        OR (rc.user_id = auth.uid() AND rc.permission IN ('maintain', 'admin'))
      )
    )
  );
