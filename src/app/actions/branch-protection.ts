'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { BranchProtectionRule } from '@/types';

export async function getBranchProtectionRules(
  repositoryId: string
): Promise<BranchProtectionRule[]> {
  const supabase = await createClient();

  const { data: rules } = await supabase
    .from('branch_protection_rules')
    .select('*')
    .eq('repository_id', repositoryId)
    .order('pattern');

  return (rules as BranchProtectionRule[]) || [];
}

export async function getBranchProtectionRule(
  repositoryId: string,
  pattern: string
): Promise<BranchProtectionRule | null> {
  const supabase = await createClient();

  const { data: rule } = await supabase
    .from('branch_protection_rules')
    .select('*')
    .eq('repository_id', repositoryId)
    .eq('pattern', pattern)
    .single();

  return rule as BranchProtectionRule | null;
}

export async function createBranchProtectionRule(
  repositoryId: string,
  data: {
    pattern: string;
    requirePullRequest?: boolean;
    requiredApprovingReviewCount?: number;
    requireCodeOwnerReviews?: boolean;
    dismissStaleReviews?: boolean;
    requireStatusChecks?: boolean;
    requiredStatusChecks?: string[];
    requireBranchesUpToDate?: boolean;
    requireConversationResolution?: boolean;
    requireSignedCommits?: boolean;
    requireLinearHistory?: boolean;
    allowForcePushes?: boolean;
    allowDeletions?: boolean;
    lockBranch?: boolean;
  }
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'You must be logged in to manage branch protection' };
  }

  // Check permissions
  const { data: repo } = await supabase
    .from('repositories')
    .select('owner_id, owner_type, name')
    .eq('id', repositoryId)
    .single();

  if (!repo) {
    return { error: 'Repository not found' };
  }

  const isOwner = repo.owner_type === 'user' && repo.owner_id === user.id;
  const { data: collaborator } = await supabase
    .from('repository_collaborators')
    .select('permission')
    .eq('repository_id', repositoryId)
    .eq('user_id', user.id)
    .single();

  if (!isOwner && collaborator?.permission !== 'admin') {
    return { error: 'You must be an admin to manage branch protection' };
  }

  // Check if rule already exists
  const { data: existingRule } = await supabase
    .from('branch_protection_rules')
    .select('id')
    .eq('repository_id', repositoryId)
    .eq('pattern', data.pattern)
    .single();

  if (existingRule) {
    return { error: 'A protection rule for this branch pattern already exists' };
  }

  // Create rule
  const { data: rule, error } = await supabase
    .from('branch_protection_rules')
    .insert({
      repository_id: repositoryId,
      pattern: data.pattern,
      require_pull_request: data.requirePullRequest ?? false,
      required_approving_review_count: data.requiredApprovingReviewCount ?? 0,
      require_code_owner_reviews: data.requireCodeOwnerReviews ?? false,
      dismiss_stale_reviews: data.dismissStaleReviews ?? false,
      require_status_checks: data.requireStatusChecks ?? false,
      required_status_checks: data.requiredStatusChecks ?? [],
      require_branches_up_to_date: data.requireBranchesUpToDate ?? false,
      require_conversation_resolution: data.requireConversationResolution ?? false,
      require_signed_commits: data.requireSignedCommits ?? false,
      require_linear_history: data.requireLinearHistory ?? false,
      allow_force_pushes: data.allowForcePushes ?? false,
      allow_deletions: data.allowDeletions ?? false,
      lock_branch: data.lockBranch ?? false,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating branch protection rule:', error);
    return { error: 'Failed to create branch protection rule' };
  }

  revalidatePath('/');
  return { rule };
}

export async function updateBranchProtectionRule(
  ruleId: string,
  data: {
    requirePullRequest?: boolean;
    requiredApprovingReviewCount?: number;
    requireCodeOwnerReviews?: boolean;
    dismissStaleReviews?: boolean;
    requireStatusChecks?: boolean;
    requiredStatusChecks?: string[];
    requireBranchesUpToDate?: boolean;
    requireConversationResolution?: boolean;
    requireSignedCommits?: boolean;
    requireLinearHistory?: boolean;
    allowForcePushes?: boolean;
    allowDeletions?: boolean;
    lockBranch?: boolean;
  }
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Unauthorized' };
  }

  // Get rule and check permissions
  const { data: rule } = await supabase
    .from('branch_protection_rules')
    .select('repository_id')
    .eq('id', ruleId)
    .single();

  if (!rule) {
    return { error: 'Protection rule not found' };
  }

  const { data: repo } = await supabase
    .from('repositories')
    .select('owner_id, owner_type')
    .eq('id', rule.repository_id)
    .single();

  const isOwner = repo?.owner_type === 'user' && repo?.owner_id === user.id;
  const { data: collaborator } = await supabase
    .from('repository_collaborators')
    .select('permission')
    .eq('repository_id', rule.repository_id)
    .eq('user_id', user.id)
    .single();

  if (!isOwner && collaborator?.permission !== 'admin') {
    return { error: 'You must be an admin to manage branch protection' };
  }

  // Update rule
  const updateData: Record<string, any> = {};
  if (data.requirePullRequest !== undefined) updateData.require_pull_request = data.requirePullRequest;
  if (data.requiredApprovingReviewCount !== undefined) updateData.required_approving_review_count = data.requiredApprovingReviewCount;
  if (data.requireCodeOwnerReviews !== undefined) updateData.require_code_owner_reviews = data.requireCodeOwnerReviews;
  if (data.dismissStaleReviews !== undefined) updateData.dismiss_stale_reviews = data.dismissStaleReviews;
  if (data.requireStatusChecks !== undefined) updateData.require_status_checks = data.requireStatusChecks;
  if (data.requiredStatusChecks !== undefined) updateData.required_status_checks = data.requiredStatusChecks;
  if (data.requireBranchesUpToDate !== undefined) updateData.require_branches_up_to_date = data.requireBranchesUpToDate;
  if (data.requireConversationResolution !== undefined) updateData.require_conversation_resolution = data.requireConversationResolution;
  if (data.requireSignedCommits !== undefined) updateData.require_signed_commits = data.requireSignedCommits;
  if (data.requireLinearHistory !== undefined) updateData.require_linear_history = data.requireLinearHistory;
  if (data.allowForcePushes !== undefined) updateData.allow_force_pushes = data.allowForcePushes;
  if (data.allowDeletions !== undefined) updateData.allow_deletions = data.allowDeletions;
  if (data.lockBranch !== undefined) updateData.lock_branch = data.lockBranch;

  const { error } = await supabase
    .from('branch_protection_rules')
    .update(updateData)
    .eq('id', ruleId);

  if (error) {
    return { error: 'Failed to update branch protection rule' };
  }

  revalidatePath('/');
  return { success: true };
}

export async function deleteBranchProtectionRule(ruleId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Unauthorized' };
  }

  // Get rule and check permissions
  const { data: rule } = await supabase
    .from('branch_protection_rules')
    .select('repository_id')
    .eq('id', ruleId)
    .single();

  if (!rule) {
    return { error: 'Protection rule not found' };
  }

  const { data: repo } = await supabase
    .from('repositories')
    .select('owner_id, owner_type')
    .eq('id', rule.repository_id)
    .single();

  const isOwner = repo?.owner_type === 'user' && repo?.owner_id === user.id;
  const { data: collaborator } = await supabase
    .from('repository_collaborators')
    .select('permission')
    .eq('repository_id', rule.repository_id)
    .eq('user_id', user.id)
    .single();

  if (!isOwner && collaborator?.permission !== 'admin') {
    return { error: 'You must be an admin to manage branch protection' };
  }

  const { error } = await supabase
    .from('branch_protection_rules')
    .delete()
    .eq('id', ruleId);

  if (error) {
    return { error: 'Failed to delete branch protection rule' };
  }

  revalidatePath('/');
  return { success: true };
}

/**
 * Check if a branch is protected and return the matching rule
 */
export async function checkBranchProtection(
  repositoryId: string,
  branchName: string
): Promise<BranchProtectionRule | null> {
  const rules = await getBranchProtectionRules(repositoryId);

  for (const rule of rules) {
    if (matchBranchPattern(branchName, rule.pattern)) {
      return rule;
    }
  }

  return null;
}

/**
 * Match branch name against a pattern (supports wildcards)
 */
function matchBranchPattern(branchName: string, pattern: string): boolean {
  // Convert pattern to regex
  // * matches any character sequence
  // ? matches single character
  const regexPattern = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&') // Escape special chars
    .replace(/\*/g, '.*') // * -> .*
    .replace(/\?/g, '.'); // ? -> .

  const regex = new RegExp(`^${regexPattern}$`);
  return regex.test(branchName);
}
