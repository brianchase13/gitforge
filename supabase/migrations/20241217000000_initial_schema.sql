-- ============================================================================
-- GITFORGE DATABASE SCHEMA
-- Run this in Supabase SQL Editor to set up the database
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- USERS
-- ============================================================================

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL CHECK (username ~ '^[a-z0-9]([a-z0-9-]{0,38}[a-z0-9])?$'),
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  location TEXT,
  website TEXT,
  email TEXT NOT NULL,
  email_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- SSH Keys for Git authentication
CREATE TABLE IF NOT EXISTS ssh_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  key_type TEXT NOT NULL CHECK (key_type IN ('ssh-rsa', 'ssh-ed25519', 'ecdsa-sha2-nistp256')),
  public_key TEXT NOT NULL,
  fingerprint TEXT UNIQUE NOT NULL,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Personal Access Tokens
CREATE TABLE IF NOT EXISTS access_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  token_hash TEXT UNIQUE NOT NULL,
  token_prefix TEXT NOT NULL,
  scopes TEXT[] NOT NULL DEFAULT '{}',
  expires_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- ORGANIZATIONS & TEAMS
-- ============================================================================

CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL CHECK (slug ~ '^[a-z0-9]([a-z0-9-]{0,38}[a-z0-9])?$'),
  name TEXT NOT NULL,
  description TEXT,
  avatar_url TEXT,
  website TEXT,
  billing_email TEXT,
  plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'team', 'enterprise')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, user_id)
);

CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  privacy TEXT DEFAULT 'visible' CHECK (privacy IN ('visible', 'secret')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, slug)
);

CREATE TABLE IF NOT EXISTS team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('maintainer', 'member')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(team_id, user_id)
);

-- ============================================================================
-- REPOSITORIES
-- ============================================================================

CREATE TABLE IF NOT EXISTS repositories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_type TEXT NOT NULL CHECK (owner_type IN ('user', 'organization')),
  owner_id UUID NOT NULL,
  name TEXT NOT NULL CHECK (name ~ '^[a-zA-Z0-9._-]+$'),
  description TEXT,
  visibility TEXT DEFAULT 'public' CHECK (visibility IN ('public', 'private', 'internal')),
  default_branch TEXT DEFAULT 'main',
  is_fork BOOLEAN DEFAULT FALSE,
  forked_from_id UUID REFERENCES repositories(id) ON DELETE SET NULL,
  is_archived BOOLEAN DEFAULT FALSE,
  is_template BOOLEAN DEFAULT FALSE,
  has_issues BOOLEAN DEFAULT TRUE,
  has_pull_requests BOOLEAN DEFAULT TRUE,
  has_wiki BOOLEAN DEFAULT FALSE,
  has_discussions BOOLEAN DEFAULT FALSE,
  stars_count INTEGER DEFAULT 0,
  forks_count INTEGER DEFAULT 0,
  watchers_count INTEGER DEFAULT 0,
  open_issues_count INTEGER DEFAULT 0,
  storage_path TEXT NOT NULL,
  size_bytes BIGINT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  pushed_at TIMESTAMPTZ,
  UNIQUE(owner_id, name)
);

CREATE TABLE IF NOT EXISTS repository_collaborators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repository_id UUID NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  permission TEXT NOT NULL CHECK (permission IN ('read', 'triage', 'write', 'maintain', 'admin')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(repository_id, user_id)
);

CREATE TABLE IF NOT EXISTS team_repositories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  repository_id UUID NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
  permission TEXT NOT NULL CHECK (permission IN ('read', 'triage', 'write', 'maintain', 'admin')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(team_id, repository_id)
);

CREATE TABLE IF NOT EXISTS stars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  repository_id UUID NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, repository_id)
);

CREATE TABLE IF NOT EXISTS watchers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  repository_id UUID NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, repository_id)
);

-- ============================================================================
-- ISSUES
-- ============================================================================

CREATE TABLE IF NOT EXISTS labels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repository_id UUID NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT NOT NULL DEFAULT '0366d6',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(repository_id, name)
);

CREATE TABLE IF NOT EXISTS milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repository_id UUID NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
  number SERIAL,
  title TEXT NOT NULL,
  description TEXT,
  state TEXT DEFAULT 'open' CHECK (state IN ('open', 'closed')),
  due_on TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(repository_id, number)
);

CREATE TABLE IF NOT EXISTS issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repository_id UUID NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
  number SERIAL,
  title TEXT NOT NULL,
  body TEXT,
  body_html TEXT,
  state TEXT DEFAULT 'open' CHECK (state IN ('open', 'closed')),
  state_reason TEXT CHECK (state_reason IN ('completed', 'not_planned', 'reopened')),
  author_id UUID NOT NULL REFERENCES users(id),
  milestone_id UUID REFERENCES milestones(id) ON DELETE SET NULL,
  locked BOOLEAN DEFAULT FALSE,
  lock_reason TEXT CHECK (lock_reason IN ('off-topic', 'too heated', 'resolved', 'spam')),
  comments_count INTEGER DEFAULT 0,
  reactions_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  closed_at TIMESTAMPTZ,
  closed_by_id UUID REFERENCES users(id),
  UNIQUE(repository_id, number)
);

CREATE TABLE IF NOT EXISTS issue_labels (
  issue_id UUID NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
  label_id UUID NOT NULL REFERENCES labels(id) ON DELETE CASCADE,
  PRIMARY KEY (issue_id, label_id)
);

CREATE TABLE IF NOT EXISTS issue_assignees (
  issue_id UUID NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (issue_id, user_id)
);

-- ============================================================================
-- PULL REQUESTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS pull_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repository_id UUID NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
  number SERIAL,
  title TEXT NOT NULL,
  body TEXT,
  body_html TEXT,
  state TEXT DEFAULT 'open' CHECK (state IN ('open', 'closed', 'merged')),
  draft BOOLEAN DEFAULT FALSE,
  head_ref TEXT NOT NULL,
  head_sha TEXT NOT NULL,
  head_repository_id UUID REFERENCES repositories(id),
  base_ref TEXT NOT NULL,
  base_sha TEXT NOT NULL,
  mergeable BOOLEAN,
  mergeable_state TEXT CHECK (mergeable_state IN ('clean', 'dirty', 'unstable', 'blocked', 'behind', 'unknown')),
  merged BOOLEAN DEFAULT FALSE,
  merged_at TIMESTAMPTZ,
  merged_by_id UUID REFERENCES users(id),
  merge_commit_sha TEXT,
  author_id UUID NOT NULL REFERENCES users(id),
  milestone_id UUID REFERENCES milestones(id) ON DELETE SET NULL,
  commits_count INTEGER DEFAULT 0,
  additions INTEGER DEFAULT 0,
  deletions INTEGER DEFAULT 0,
  changed_files INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  review_comments_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  closed_at TIMESTAMPTZ,
  UNIQUE(repository_id, number)
);

CREATE TABLE IF NOT EXISTS pull_request_labels (
  pull_request_id UUID NOT NULL REFERENCES pull_requests(id) ON DELETE CASCADE,
  label_id UUID NOT NULL REFERENCES labels(id) ON DELETE CASCADE,
  PRIMARY KEY (pull_request_id, label_id)
);

CREATE TABLE IF NOT EXISTS pull_request_assignees (
  pull_request_id UUID NOT NULL REFERENCES pull_requests(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (pull_request_id, user_id)
);

CREATE TABLE IF NOT EXISTS pull_request_reviewers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pull_request_id UUID NOT NULL REFERENCES pull_requests(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  state TEXT DEFAULT 'pending' CHECK (state IN ('pending', 'approved', 'changes_requested', 'commented', 'dismissed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (user_id IS NOT NULL OR team_id IS NOT NULL)
);

-- ============================================================================
-- REVIEWS & COMMENTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pull_request_id UUID NOT NULL REFERENCES pull_requests(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES users(id),
  body TEXT,
  body_html TEXT,
  state TEXT NOT NULL CHECK (state IN ('pending', 'approved', 'changes_requested', 'commented', 'dismissed')),
  commit_sha TEXT NOT NULL,
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  commentable_type TEXT NOT NULL CHECK (commentable_type IN ('issue', 'pull_request', 'commit', 'review')),
  commentable_id UUID NOT NULL,
  path TEXT,
  position INTEGER,
  original_position INTEGER,
  commit_sha TEXT,
  diff_hunk TEXT,
  line INTEGER,
  side TEXT CHECK (side IN ('LEFT', 'RIGHT')),
  start_line INTEGER,
  start_side TEXT CHECK (start_side IN ('LEFT', 'RIGHT')),
  body TEXT NOT NULL,
  body_html TEXT,
  author_id UUID NOT NULL REFERENCES users(id),
  in_reply_to_id UUID REFERENCES comments(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- CI/CD
-- ============================================================================

CREATE TABLE IF NOT EXISTS workflow_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repository_id UUID NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
  path TEXT NOT NULL,
  name TEXT NOT NULL,
  content TEXT NOT NULL,
  enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(repository_id, path)
);

CREATE TABLE IF NOT EXISTS workflow_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repository_id UUID NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
  workflow_file_id UUID NOT NULL REFERENCES workflow_files(id) ON DELETE CASCADE,
  run_number SERIAL,
  event TEXT NOT NULL,
  head_branch TEXT NOT NULL,
  head_sha TEXT NOT NULL,
  pull_request_id UUID REFERENCES pull_requests(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'queued' CHECK (status IN ('queued', 'in_progress', 'completed', 'waiting')),
  conclusion TEXT CHECK (conclusion IN ('success', 'failure', 'cancelled', 'skipped', 'timed_out', 'action_required')),
  external_ci_provider TEXT,
  external_ci_run_id TEXT,
  external_ci_run_url TEXT,
  triggered_by_id UUID REFERENCES users(id),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS workflow_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_run_id UUID NOT NULL REFERENCES workflow_runs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  status TEXT DEFAULT 'queued' CHECK (status IN ('queued', 'in_progress', 'completed', 'waiting')),
  conclusion TEXT CHECK (conclusion IN ('success', 'failure', 'cancelled', 'skipped')),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  logs_url TEXT,
  logs_expired BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS workflow_job_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES workflow_jobs(id) ON DELETE CASCADE,
  number INTEGER NOT NULL,
  name TEXT NOT NULL,
  status TEXT DEFAULT 'queued' CHECK (status IN ('queued', 'in_progress', 'completed')),
  conclusion TEXT CHECK (conclusion IN ('success', 'failure', 'skipped')),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  UNIQUE(job_id, number)
);

-- ============================================================================
-- WEBHOOKS
-- ============================================================================

CREATE TABLE IF NOT EXISTS webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repository_id UUID REFERENCES repositories(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  secret TEXT,
  content_type TEXT DEFAULT 'json' CHECK (content_type IN ('json', 'form')),
  events TEXT[] NOT NULL DEFAULT '{push}',
  active BOOLEAN DEFAULT TRUE,
  last_delivery_at TIMESTAMPTZ,
  last_delivery_status INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (repository_id IS NOT NULL OR organization_id IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS webhook_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id UUID NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
  event TEXT NOT NULL,
  request_headers JSONB,
  request_payload JSONB,
  response_status INTEGER,
  response_headers JSONB,
  response_body TEXT,
  delivered_at TIMESTAMPTZ DEFAULT NOW(),
  duration_ms INTEGER
);

-- ============================================================================
-- ACTIVITY & NOTIFICATIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  actor_id UUID NOT NULL REFERENCES users(id),
  repository_id UUID REFERENCES repositories(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  payload JSONB NOT NULL,
  public BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('issue', 'pull_request', 'comment', 'mention', 'review', 'star', 'follow')),
  title TEXT NOT NULL,
  body TEXT,
  url TEXT NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
  repository_id UUID REFERENCES repositories(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Follows (for following users)
CREATE TABLE IF NOT EXISTS follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(follower_id, following_id)
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

CREATE INDEX IF NOT EXISTS idx_organizations_slug ON organizations(slug);

CREATE INDEX IF NOT EXISTS idx_repositories_owner ON repositories(owner_type, owner_id);
CREATE INDEX IF NOT EXISTS idx_repositories_visibility ON repositories(visibility);
CREATE INDEX IF NOT EXISTS idx_repositories_name ON repositories(name);

CREATE INDEX IF NOT EXISTS idx_issues_repo_state ON issues(repository_id, state);
CREATE INDEX IF NOT EXISTS idx_issues_author ON issues(author_id);
CREATE INDEX IF NOT EXISTS idx_issues_number ON issues(repository_id, number);

CREATE INDEX IF NOT EXISTS idx_pull_requests_repo_state ON pull_requests(repository_id, state);
CREATE INDEX IF NOT EXISTS idx_pull_requests_author ON pull_requests(author_id);
CREATE INDEX IF NOT EXISTS idx_pull_requests_number ON pull_requests(repository_id, number);

CREATE INDEX IF NOT EXISTS idx_comments_commentable ON comments(commentable_type, commentable_id);
CREATE INDEX IF NOT EXISTS idx_comments_author ON comments(author_id);

CREATE INDEX IF NOT EXISTS idx_workflow_runs_repo ON workflow_runs(repository_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_events_actor ON events(actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_repo ON events(repository_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_follows_follower ON follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following ON follows(following_id);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE repositories ENABLE ROW LEVEL SECURITY;
ALTER TABLE issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE pull_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users are viewable by everyone" ON users
  FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

-- Organizations policies
CREATE POLICY "Organizations are viewable by everyone" ON organizations
  FOR SELECT USING (true);

CREATE POLICY "Org owners can update" ON organizations
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_id = organizations.id
      AND user_id = auth.uid()
      AND role = 'owner'
    )
  );

-- Repositories policies
CREATE POLICY "Public repos are viewable by everyone" ON repositories
  FOR SELECT USING (visibility = 'public');

CREATE POLICY "Private repos viewable by owner" ON repositories
  FOR SELECT USING (
    visibility = 'private' AND (
      (owner_type = 'user' AND owner_id = auth.uid()) OR
      EXISTS (
        SELECT 1 FROM repository_collaborators
        WHERE repository_id = repositories.id
        AND user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can create repos" ON repositories
  FOR INSERT WITH CHECK (
    owner_type = 'user' AND owner_id = auth.uid()
  );

CREATE POLICY "Owners can update repos" ON repositories
  FOR UPDATE USING (
    (owner_type = 'user' AND owner_id = auth.uid()) OR
    EXISTS (
      SELECT 1 FROM repository_collaborators
      WHERE repository_id = repositories.id
      AND user_id = auth.uid()
      AND permission = 'admin'
    )
  );

-- Issues policies
CREATE POLICY "Issues on public repos are viewable" ON issues
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM repositories
      WHERE id = issues.repository_id
      AND visibility = 'public'
    )
  );

CREATE POLICY "Authenticated users can create issues" ON issues
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM repositories
      WHERE id = issues.repository_id
      AND (visibility = 'public' OR owner_id = auth.uid())
    )
  );

-- Comments policies
CREATE POLICY "Comments are viewable by everyone" ON comments
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create comments" ON comments
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authors can update own comments" ON comments
  FOR UPDATE USING (author_id = auth.uid());

-- Notifications policies
CREATE POLICY "Users can view own notifications" ON notifications
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications" ON notifications
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete own notifications" ON notifications
  FOR DELETE USING (user_id = auth.uid());

-- Follows policies
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Follows are viewable by everyone" ON follows
  FOR SELECT USING (true);

CREATE POLICY "Users can follow others" ON follows
  FOR INSERT WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users can unfollow" ON follows
  FOR DELETE USING (auth.uid() = follower_id);

-- Stars policies
ALTER TABLE stars ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Stars are viewable by everyone" ON stars
  FOR SELECT USING (true);

CREATE POLICY "Users can star repos" ON stars
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unstar" ON stars
  FOR DELETE USING (auth.uid() = user_id);

-- Labels policies
ALTER TABLE labels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Labels are viewable by everyone" ON labels
  FOR SELECT USING (true);

-- Events policies
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public events are viewable by everyone" ON events
  FOR SELECT USING (public = true);

-- ============================================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_repositories_updated_at
  BEFORE UPDATE ON repositories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_issues_updated_at
  BEFORE UPDATE ON issues
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pull_requests_updated_at
  BEFORE UPDATE ON pull_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_comments_updated_at
  BEFORE UPDATE ON comments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to increment issue number
CREATE OR REPLACE FUNCTION get_next_issue_number(repo_id UUID)
RETURNS INTEGER AS $$
DECLARE
  next_num INTEGER;
BEGIN
  SELECT COALESCE(MAX(number), 0) + 1 INTO next_num
  FROM issues WHERE repository_id = repo_id;
  RETURN next_num;
END;
$$ LANGUAGE plpgsql;

-- Function to increment PR number
CREATE OR REPLACE FUNCTION get_next_pr_number(repo_id UUID)
RETURNS INTEGER AS $$
DECLARE
  next_num INTEGER;
BEGIN
  SELECT COALESCE(MAX(number), 0) + 1 INTO next_num
  FROM pull_requests WHERE repository_id = repo_id;
  RETURN next_num;
END;
$$ LANGUAGE plpgsql;

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, username)
  VALUES (
    NEW.id,
    NEW.email,
    LOWER(SPLIT_PART(NEW.email, '@', 1) || '-' || SUBSTRING(NEW.id::TEXT FROM 1 FOR 8))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-create user profile
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Function to update star count
CREATE OR REPLACE FUNCTION update_star_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE repositories SET stars_count = stars_count + 1 WHERE id = NEW.repository_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE repositories SET stars_count = stars_count - 1 WHERE id = OLD.repository_id;
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_repository_star_count
  AFTER INSERT OR DELETE ON stars
  FOR EACH ROW EXECUTE FUNCTION update_star_count();

-- Function to update comment count on issues
CREATE OR REPLACE FUNCTION update_issue_comment_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.commentable_type = 'issue' THEN
    UPDATE issues SET comments_count = comments_count + 1 WHERE id = NEW.commentable_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' AND OLD.commentable_type = 'issue' THEN
    UPDATE issues SET comments_count = comments_count - 1 WHERE id = OLD.commentable_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_issue_comments
  AFTER INSERT OR DELETE ON comments
  FOR EACH ROW EXECUTE FUNCTION update_issue_comment_count();

-- ============================================================================
-- STORAGE BUCKET
-- ============================================================================

-- Create storage bucket for repositories (run this separately in Supabase dashboard)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('repositories', 'repositories', false);
