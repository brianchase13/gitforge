// ============================================================================
// DATABASE TYPES
// ============================================================================

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// User types
export interface User {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  location: string | null;
  website: string | null;
  email: string;
  email_verified: boolean;
  created_at: string;
  updated_at: string;
}

// Organization types
export interface Organization {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  avatar_url: string | null;
  website: string | null;
  billing_email: string | null;
  plan: 'free' | 'team' | 'enterprise';
  created_at: string;
  updated_at: string;
}

export interface OrganizationMember {
  id: string;
  organization_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'member';
  created_at: string;
}

export interface Team {
  id: string;
  organization_id: string;
  slug: string;
  name: string;
  description: string | null;
  privacy: 'visible' | 'secret';
  created_at: string;
}

export interface TeamMember {
  id: string;
  team_id: string;
  user_id: string;
  role: 'maintainer' | 'member';
  created_at: string;
}

// Repository types
export type RepositoryVisibility = 'public' | 'private' | 'internal';
export type OwnerType = 'user' | 'organization';

export interface Repository {
  id: string;
  owner_type: OwnerType;
  owner_id: string;
  name: string;
  description: string | null;
  visibility: RepositoryVisibility;
  default_branch: string;
  is_fork: boolean;
  forked_from_id: string | null;
  is_archived: boolean;
  is_template: boolean;
  has_issues: boolean;
  has_pull_requests: boolean;
  has_wiki: boolean;
  has_discussions: boolean;
  stars_count: number;
  forks_count: number;
  watchers_count: number;
  open_issues_count: number;
  storage_path: string;
  size_bytes: number;
  topics: string[] | null;
  homepage_url: string | null;
  created_at: string;
  updated_at: string;
  pushed_at: string | null;
}

export type Permission = 'read' | 'triage' | 'write' | 'maintain' | 'admin';

export interface RepositoryCollaborator {
  id: string;
  repository_id: string;
  user_id: string;
  permission: Permission;
  created_at: string;
}

// Issue types
export type IssueState = 'open' | 'closed';
export type StateReason = 'completed' | 'not_planned' | 'reopened';
export type LockReason = 'off-topic' | 'too heated' | 'resolved' | 'spam';

export interface Label {
  id: string;
  repository_id: string;
  name: string;
  description: string | null;
  color: string;
  created_at: string;
}

export interface Milestone {
  id: string;
  repository_id: string;
  number: number;
  title: string;
  description: string | null;
  state: 'open' | 'closed';
  due_on: string | null;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Issue {
  id: string;
  repository_id: string;
  number: number;
  title: string;
  body: string | null;
  body_html: string | null;
  state: IssueState;
  state_reason: StateReason | null;
  author_id: string;
  milestone_id: string | null;
  locked: boolean;
  lock_reason: LockReason | null;
  comments_count: number;
  reactions_count: number;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  closed_by_id: string | null;
}

export interface IssueComment {
  id: string;
  issue_id: string;
  author_id: string;
  body: string;
  body_html: string | null;
  created_at: string;
  updated_at: string;
  author?: {
    id: string;
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  };
}

// Pull Request types
export type PRState = 'open' | 'closed' | 'merged';
export type MergeableState = 'clean' | 'dirty' | 'unstable' | 'blocked' | 'behind' | 'unknown';

export interface PullRequest {
  id: string;
  repository_id: string;
  number: number;
  title: string;
  body: string | null;
  body_html: string | null;
  state: PRState;
  draft: boolean;
  head_ref: string;
  head_sha: string;
  head_repository_id: string | null;
  base_ref: string;
  base_sha: string;
  mergeable: boolean | null;
  mergeable_state: MergeableState | null;
  merged: boolean;
  merged_at: string | null;
  merged_by_id: string | null;
  merge_commit_sha: string | null;
  author_id: string;
  milestone_id: string | null;
  commits_count: number;
  additions: number;
  deletions: number;
  changed_files: number;
  comments_count: number;
  review_comments_count: number;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
}

export type ReviewState = 'pending' | 'approved' | 'changes_requested' | 'commented' | 'dismissed';

export interface Review {
  id: string;
  pull_request_id: string;
  author_id: string;
  body: string | null;
  body_html: string | null;
  state: ReviewState;
  commit_sha: string;
  submitted_at: string | null;
  created_at: string;
}

// Comment types
export type CommentableType = 'issue' | 'pull_request' | 'commit' | 'review';
export type DiffSide = 'LEFT' | 'RIGHT';

export interface Comment {
  id: string;
  commentable_type: CommentableType;
  commentable_id: string;
  path: string | null;
  position: number | null;
  original_position: number | null;
  commit_sha: string | null;
  diff_hunk: string | null;
  line: number | null;
  side: DiffSide | null;
  start_line: number | null;
  start_side: DiffSide | null;
  body: string;
  body_html: string | null;
  author_id: string;
  in_reply_to_id: string | null;
  created_at: string;
  updated_at: string;
}

// CI/CD types
export type WorkflowEvent = 'push' | 'pull_request' | 'workflow_dispatch' | 'schedule';
export type WorkflowStatus = 'queued' | 'in_progress' | 'completed' | 'waiting';
export type WorkflowConclusion = 'success' | 'failure' | 'cancelled' | 'skipped' | 'timed_out' | 'action_required';
export type JobConclusion = 'success' | 'failure' | 'cancelled' | 'skipped';

export interface WorkflowFile {
  id: string;
  repository_id: string;
  path: string;
  name: string;
  content: string;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface WorkflowRun {
  id: string;
  repository_id: string;
  workflow_file_id: string;
  run_number: number;
  event: WorkflowEvent;
  head_branch: string;
  head_sha: string;
  pull_request_id: string | null;
  status: WorkflowStatus;
  conclusion: WorkflowConclusion | null;
  external_ci_provider: string | null;
  external_ci_run_id: string | null;
  external_ci_run_url: string | null;
  triggered_by_id: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface WorkflowJob {
  id: string;
  workflow_run_id: string;
  name: string;
  status: WorkflowStatus;
  conclusion: JobConclusion | null;
  started_at: string | null;
  completed_at: string | null;
  logs_url: string | null;
  logs_expired: boolean;
  created_at: string;
}

// Branch Protection types
export interface BranchProtectionRule {
  id: string;
  repository_id: string;
  pattern: string;
  require_pull_request: boolean;
  required_approving_review_count: number;
  require_code_owner_reviews: boolean;
  dismiss_stale_reviews: boolean;
  require_status_checks: boolean;
  required_status_checks: string[];
  require_branches_up_to_date: boolean;
  require_conversation_resolution: boolean;
  require_signed_commits: boolean;
  require_linear_history: boolean;
  allow_force_pushes: boolean;
  allow_deletions: boolean;
  lock_branch: boolean;
  created_at: string;
  updated_at: string;
}

// Release types
export interface Release {
  id: string;
  repository_id: string;
  tag_name: string;
  target_commitish: string;
  name: string | null;
  body: string | null;
  body_html: string | null;
  draft: boolean;
  prerelease: boolean;
  author_id: string;
  created_at: string;
  published_at: string | null;
  author?: {
    id: string;
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  };
}

// Webhook types
export interface Webhook {
  id: string;
  repository_id: string | null;
  organization_id: string | null;
  url: string;
  secret: string | null;
  content_type: 'json' | 'form';
  events: string[];
  active: boolean;
  last_delivery_at: string | null;
  last_delivery_status: number | null;
  created_at: string;
  updated_at: string;
}

// Access Token types
export interface AccessToken {
  id: string;
  user_id: string;
  name: string;
  token_hash: string;
  token_prefix: string;
  scopes: string[];
  expires_at: string | null;
  last_used_at: string | null;
  created_at: string;
}

export interface SSHKey {
  id: string;
  user_id: string;
  title: string;
  key_type: 'ssh-rsa' | 'ssh-ed25519' | 'ecdsa-sha2-nistp256';
  public_key: string;
  fingerprint: string;
  last_used_at: string | null;
  created_at: string;
}

// Reaction types
export type ReactionType = '+1' | '-1' | 'laugh' | 'hooray' | 'confused' | 'heart' | 'rocket' | 'eyes';
export type ReactableType = 'issue' | 'pull_request' | 'comment';

export interface Reaction {
  id: string;
  reactable_type: ReactableType;
  reactable_id: string;
  user_id: string;
  reaction: ReactionType;
  created_at: string;
  user?: {
    id: string;
    username: string;
    avatar_url: string | null;
  };
}

export interface ReactionSummary {
  reaction: ReactionType;
  count: number;
  users: { id: string; username: string }[];
  userReacted: boolean;
}

// Template types
export type TemplateType = 'issue' | 'pull_request';

export interface Template {
  id: string;
  repository_id: string;
  template_type: TemplateType;
  name: string;
  description: string | null;
  title_template: string | null;
  body: string;
  labels: string[];
  assignees: string[];
  created_at: string;
  updated_at: string;
}

// Wiki types
export interface WikiPage {
  id: string;
  repository_id: string;
  slug: string;
  title: string;
  body: string;
  body_html: string | null;
  author_id: string;
  last_editor_id: string | null;
  created_at: string;
  updated_at: string;
  author?: {
    id: string;
    username: string;
    avatar_url: string | null;
  };
  last_editor?: {
    id: string;
    username: string;
    avatar_url: string | null;
  };
}

// Gist types
export type GistVisibility = 'public' | 'secret';

export interface Gist {
  id: string;
  author_id: string;
  description: string | null;
  visibility: GistVisibility;
  files_count: number;
  forks_count: number;
  stars_count: number;
  forked_from_id: string | null;
  created_at: string;
  updated_at: string;
  author?: {
    id: string;
    username: string;
    avatar_url: string | null;
  };
  files?: GistFile[];
}

export interface GistFile {
  id: string;
  gist_id: string;
  filename: string;
  content: string;
  language: string | null;
  size_bytes: number;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// GIT TYPES
// ============================================================================

export interface GitCommit {
  oid: string;
  message: string;
  author: {
    name: string;
    email: string;
    timestamp: number;
  };
  committer: {
    name: string;
    email: string;
    timestamp: number;
  };
  parent: string[];
  tree: string;
}

export interface GitTree {
  entries: GitTreeEntry[];
}

export interface GitTreeEntry {
  path: string;
  mode: string;
  type: 'blob' | 'tree' | 'commit';
  oid: string;
}

export interface GitBlob {
  content: Uint8Array;
  size: number;
  encoding?: string;
}

export interface GitRef {
  name: string;
  sha: string;
  type: 'branch' | 'tag';
}

export interface GitDiff {
  oldFile: string;
  newFile: string;
  additions: number;
  deletions: number;
  hunks: GitDiffHunk[];
}

export interface GitDiffHunk {
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  lines: GitDiffLine[];
}

export interface GitDiffLine {
  type: 'add' | 'del' | 'normal';
  content: string;
  oldLineNumber?: number;
  newLineNumber?: number;
}

// ============================================================================
// API TYPES
// ============================================================================

export interface ApiError {
  message: string;
  code?: string;
  status: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export interface CreateRepositoryInput {
  name: string;
  description?: string;
  visibility: RepositoryVisibility;
  init_readme?: boolean;
  gitignore_template?: string;
  license_template?: string;
}

export interface CreateIssueInput {
  title: string;
  body?: string;
  labels?: string[];
  assignees?: string[];
  milestone_id?: string;
}

export interface CreatePullRequestInput {
  title: string;
  body?: string;
  head_ref: string;
  base_ref: string;
  draft?: boolean;
}

export interface CreateCommentInput {
  body: string;
  path?: string;
  line?: number;
  side?: DiffSide;
  start_line?: number;
  start_side?: DiffSide;
}

// ============================================================================
// UI TYPES
// ============================================================================

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface TabItem {
  label: string;
  href: string;
  count?: number;
  icon?: React.ComponentType<{ className?: string }>;
}

export interface SelectOption {
  value: string;
  label: string;
  description?: string;
}
