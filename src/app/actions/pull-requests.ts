'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import type { PullRequest } from '@/types';
import { mergeBranches } from '@/lib/git/merge';

export async function createPullRequest(
  repositoryId: string,
  formData: FormData
): Promise<{ error?: string; pullRequest?: PullRequest }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'You must be logged in to create a pull request' };
  }

  const title = formData.get('title') as string;
  const body = formData.get('body') as string | null;
  const headBranch = formData.get('head_branch') as string;
  const baseBranch = formData.get('base_branch') as string;
  const draft = formData.get('draft') === 'true';

  if (!title || title.trim().length === 0) {
    return { error: 'Title is required' };
  }

  if (!headBranch || !baseBranch) {
    return { error: 'Both head and base branches are required' };
  }

  if (headBranch === baseBranch) {
    return { error: 'Head and base branches must be different' };
  }

  // Get repository to check access
  const { data: repository } = await supabase
    .from('repositories')
    .select('id, owner_id, name, has_pull_requests')
    .eq('id', repositoryId)
    .single();

  if (!repository) {
    return { error: 'Repository not found' };
  }

  if (!repository.has_pull_requests) {
    return { error: 'Pull requests are disabled for this repository' };
  }

  // Get next PR number
  const { data: lastPR } = await supabase
    .from('pull_requests')
    .select('number')
    .eq('repository_id', repositoryId)
    .order('number', { ascending: false })
    .limit(1)
    .single();

  const number = (lastPR?.number || 0) + 1;

  // Create pull request
  const { data: pullRequest, error } = await supabase
    .from('pull_requests')
    .insert({
      repository_id: repositoryId,
      number,
      title: title.trim(),
      body: body?.trim() || null,
      author_id: user.id,
      state: 'open',
      draft,
      head_ref: headBranch,
      base_ref: baseBranch,
      head_sha: '', // TODO: Get actual SHA
      base_sha: '', // TODO: Get actual SHA
      mergeable: true,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating pull request:', error);
    return { error: 'Failed to create pull request' };
  }

  // Get owner username for redirect
  const { data: owner } = await supabase
    .from('users')
    .select('username')
    .eq('id', repository.owner_id)
    .single();

  revalidatePath(`/${owner?.username}/${repository.name}/pulls`);

  return { pullRequest: pullRequest as PullRequest };
}

export async function updatePullRequest(
  pullRequestId: string,
  updates: Partial<Pick<PullRequest, 'title' | 'body' | 'state'>>
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Unauthorized' };
  }

  // Get PR to check permissions
  const { data: pullRequest } = await supabase
    .from('pull_requests')
    .select('*, repositories(owner_id)')
    .eq('id', pullRequestId)
    .single();

  if (!pullRequest) {
    return { error: 'Pull request not found' };
  }

  // Check if user can edit (author or repo owner)
  const isAuthor = pullRequest.author_id === user.id;
  const isOwner = (pullRequest.repositories as any)?.owner_id === user.id;

  if (!isAuthor && !isOwner) {
    return { error: 'You do not have permission to edit this pull request' };
  }

  const { error } = await supabase
    .from('pull_requests')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
      ...(updates.state === 'closed' ? { closed_at: new Date().toISOString() } : {}),
    })
    .eq('id', pullRequestId);

  if (error) {
    return { error: 'Failed to update pull request' };
  }

  revalidatePath('/');
  return { success: true };
}

export async function mergePullRequest(pullRequestId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Unauthorized' };
  }

  // Get user profile for commit author info
  const { data: userProfile } = await supabase
    .from('users')
    .select('username, display_name, email')
    .eq('id', user.id)
    .single();

  if (!userProfile) {
    return { error: 'User profile not found' };
  }

  // Get PR to check permissions and status
  const { data: pullRequest } = await supabase
    .from('pull_requests')
    .select('*, repositories(owner_id, name, storage_path)')
    .eq('id', pullRequestId)
    .single();

  if (!pullRequest) {
    return { error: 'Pull request not found' };
  }

  if (pullRequest.state !== 'open') {
    return { error: 'Pull request is not open' };
  }

  if (pullRequest.draft) {
    return { error: 'Cannot merge a draft pull request. Mark it as ready for review first.' };
  }

  if (!pullRequest.mergeable) {
    return { error: 'Pull request is not mergeable' };
  }

  const repository = pullRequest.repositories as any;

  // Check if user can merge (repo owner or collaborator with write access)
  const isOwner = repository?.owner_id === user.id;

  if (!isOwner) {
    const { data: collaborator } = await supabase
      .from('repository_collaborators')
      .select('permission')
      .eq('repository_id', pullRequest.repository_id)
      .eq('user_id', user.id)
      .single();

    if (!collaborator || !['write', 'admin'].includes(collaborator.permission)) {
      return { error: 'You do not have permission to merge this pull request' };
    }
  }

  // Perform actual Git merge
  const mergeResult = await mergeBranches(repository.storage_path, {
    headBranch: pullRequest.head_ref,
    baseBranch: pullRequest.base_ref,
    authorName: userProfile.display_name || userProfile.username,
    authorEmail: userProfile.email,
    message: `Merge pull request #${pullRequest.number} from ${pullRequest.head_ref}\n\n${pullRequest.title}`,
  });

  if (!mergeResult.success) {
    return { error: mergeResult.error || 'Failed to merge branches' };
  }

  // Update PR state with merge commit SHA
  const { error } = await supabase
    .from('pull_requests')
    .update({
      state: 'merged',
      merged: true,
      merged_at: new Date().toISOString(),
      merged_by_id: user.id,
      merge_commit_sha: mergeResult.mergeCommitSha,
      updated_at: new Date().toISOString(),
    })
    .eq('id', pullRequestId);

  if (error) {
    return { error: 'Failed to update pull request status' };
  }

  revalidatePath('/');
  return { success: true, mergeCommitSha: mergeResult.mergeCommitSha };
}

export async function getPullRequest(
  owner: string,
  repo: string,
  number: number
): Promise<PullRequest | null> {
  const supabase = await createClient();

  // Find repository
  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('username', owner)
    .single();

  if (!user) return null;

  const { data: repository } = await supabase
    .from('repositories')
    .select('id')
    .eq('owner_id', user.id)
    .eq('name', repo)
    .single();

  if (!repository) return null;

  const { data: pullRequest } = await supabase
    .from('pull_requests')
    .select(`
      *,
      author:users!pull_requests_author_id_fkey(id, username, display_name, avatar_url),
      merged_by:users!pull_requests_merged_by_id_fkey(id, username, display_name, avatar_url)
    `)
    .eq('repository_id', repository.id)
    .eq('number', number)
    .single();

  return pullRequest as PullRequest | null;
}

export async function getPullRequests(
  owner: string,
  repo: string,
  options: {
    state?: 'open' | 'closed' | 'merged' | 'all';
    page?: number;
    perPage?: number;
  } = {}
): Promise<{ pullRequests: PullRequest[]; total: number }> {
  const supabase = await createClient();

  const { state = 'open', page = 1, perPage = 25 } = options;

  // Find repository
  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('username', owner)
    .single();

  if (!user) return { pullRequests: [], total: 0 };

  const { data: repository } = await supabase
    .from('repositories')
    .select('id')
    .eq('owner_id', user.id)
    .eq('name', repo)
    .single();

  if (!repository) return { pullRequests: [], total: 0 };

  let query = supabase
    .from('pull_requests')
    .select(`
      *,
      author:users!pull_requests_author_id_fkey(id, username, display_name, avatar_url)
    `, { count: 'exact' })
    .eq('repository_id', repository.id);

  if (state !== 'all') {
    query = query.eq('state', state);
  }

  const { data: pullRequests, count } = await query
    .order('created_at', { ascending: false })
    .range((page - 1) * perPage, page * perPage - 1);

  return {
    pullRequests: (pullRequests as PullRequest[]) || [],
    total: count || 0,
  };
}

export async function addPRComment(
  pullRequestId: string,
  formData: FormData
): Promise<{ error?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'You must be logged in to comment' };
  }

  const body = formData.get('body') as string;

  if (!body || body.trim().length === 0) {
    return { error: 'Comment cannot be empty' };
  }

  const { error } = await supabase.from('comments').insert({
    pull_request_id: pullRequestId,
    author_id: user.id,
    body: body.trim(),
  });

  if (error) {
    return { error: 'Failed to add comment' };
  }

  revalidatePath('/');
  return {};
}

export async function getPRComments(pullRequestId: string) {
  const supabase = await createClient();

  const { data } = await supabase
    .from('comments')
    .select(`
      *,
      author:users!comments_author_id_fkey(id, username, display_name, avatar_url)
    `)
    .eq('pull_request_id', pullRequestId)
    .order('created_at', { ascending: true });

  return data || [];
}

export async function publishDraft(pullRequestId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Unauthorized' };
  }

  // Get PR to check permissions
  const { data: pullRequest } = await supabase
    .from('pull_requests')
    .select('*, repositories(owner_id)')
    .eq('id', pullRequestId)
    .single();

  if (!pullRequest) {
    return { error: 'Pull request not found' };
  }

  if (!pullRequest.draft) {
    return { error: 'Pull request is not a draft' };
  }

  // Check if user can publish (author or repo owner)
  const isAuthor = pullRequest.author_id === user.id;
  const isOwner = (pullRequest.repositories as any)?.owner_id === user.id;

  if (!isAuthor && !isOwner) {
    return { error: 'You do not have permission to publish this draft' };
  }

  const { error } = await supabase
    .from('pull_requests')
    .update({
      draft: false,
      updated_at: new Date().toISOString(),
    })
    .eq('id', pullRequestId);

  if (error) {
    return { error: 'Failed to publish draft' };
  }

  revalidatePath('/');
  return { success: true };
}
