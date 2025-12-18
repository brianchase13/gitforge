-- ============================================================================
-- BRANCH PROTECTION RULES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS branch_protection_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  repository_id UUID NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
  pattern TEXT NOT NULL,
  require_pull_request BOOLEAN DEFAULT FALSE,
  required_approving_review_count INTEGER DEFAULT 0,
  require_code_owner_reviews BOOLEAN DEFAULT FALSE,
  dismiss_stale_reviews BOOLEAN DEFAULT FALSE,
  require_status_checks BOOLEAN DEFAULT FALSE,
  required_status_checks TEXT[] DEFAULT '{}',
  require_branches_up_to_date BOOLEAN DEFAULT FALSE,
  require_conversation_resolution BOOLEAN DEFAULT FALSE,
  require_signed_commits BOOLEAN DEFAULT FALSE,
  require_linear_history BOOLEAN DEFAULT FALSE,
  allow_force_pushes BOOLEAN DEFAULT FALSE,
  allow_deletions BOOLEAN DEFAULT FALSE,
  lock_branch BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(repository_id, pattern)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_branch_protection_repo ON branch_protection_rules(repository_id);

-- Enable RLS
ALTER TABLE branch_protection_rules ENABLE ROW LEVEL SECURITY;

-- Branch protection rules are viewable by repo collaborators
CREATE POLICY "Branch protection rules are viewable" ON branch_protection_rules
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM repositories
      WHERE id = branch_protection_rules.repository_id
      AND (
        visibility = 'public' OR
        (owner_type = 'user' AND owner_id = auth.uid()) OR
        EXISTS (
          SELECT 1 FROM repository_collaborators
          WHERE repository_id = branch_protection_rules.repository_id
          AND user_id = auth.uid()
        )
      )
    )
  );

-- Only admins can create/update/delete branch protection rules
CREATE POLICY "Admins can manage branch protection" ON branch_protection_rules
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM repositories
      WHERE id = branch_protection_rules.repository_id
      AND (
        (owner_type = 'user' AND owner_id = auth.uid()) OR
        EXISTS (
          SELECT 1 FROM repository_collaborators
          WHERE repository_id = branch_protection_rules.repository_id
          AND user_id = auth.uid()
          AND permission = 'admin'
        )
      )
    )
  );

-- Trigger for updated_at
CREATE TRIGGER update_branch_protection_updated_at
  BEFORE UPDATE ON branch_protection_rules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
