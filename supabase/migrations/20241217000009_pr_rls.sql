-- Add RLS policies for pull_requests
ALTER TABLE pull_requests ENABLE ROW LEVEL SECURITY;

-- Anyone can view pull requests on public repositories
CREATE POLICY "Anyone can view PRs on public repos"
  ON pull_requests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM repositories r
      WHERE r.id = pull_requests.repository_id
      AND r.visibility = 'public'
    )
  );

-- Authors can view their own PRs
CREATE POLICY "Authors can view own PRs"
  ON pull_requests FOR SELECT
  USING (author_id = auth.uid());

-- Repository owners can view all PRs
CREATE POLICY "Repo owners can view all PRs"
  ON pull_requests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM repositories r
      WHERE r.id = pull_requests.repository_id
      AND r.owner_id = auth.uid()
    )
  );

-- Authors can create PRs
CREATE POLICY "Users can create PRs"
  ON pull_requests FOR INSERT
  WITH CHECK (author_id = auth.uid());

-- Authors can update their own PRs
CREATE POLICY "Authors can update own PRs"
  ON pull_requests FOR UPDATE
  USING (author_id = auth.uid());
