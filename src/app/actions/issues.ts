'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import type { Issue, IssueComment, Label } from '@/types';

export async function createIssue(
  repositoryId: string,
  formData: FormData
): Promise<{ error?: string; issue?: Issue }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'You must be logged in to create an issue' };
  }

  const title = formData.get('title') as string;
  const body = formData.get('body') as string | null;
  const labelIds = formData.getAll('labels') as string[];

  if (!title || title.trim().length === 0) {
    return { error: 'Title is required' };
  }

  // Get repository to check access
  const { data: repository } = await supabase
    .from('repositories')
    .select('id, owner_id, name, has_issues, open_issues_count')
    .eq('id', repositoryId)
    .single();

  if (!repository) {
    return { error: 'Repository not found' };
  }

  if (!repository.has_issues) {
    return { error: 'Issues are disabled for this repository' };
  }

  // Get next issue number
  const { data: lastIssue } = await supabase
    .from('issues')
    .select('number')
    .eq('repository_id', repositoryId)
    .order('number', { ascending: false })
    .limit(1)
    .single();

  const number = (lastIssue?.number || 0) + 1;

  // Create issue
  const { data: issue, error } = await supabase
    .from('issues')
    .insert({
      repository_id: repositoryId,
      number,
      title: title.trim(),
      body: body?.trim() || null,
      author_id: user.id,
      state: 'open',
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating issue:', error);
    return { error: 'Failed to create issue' };
  }

  // Add labels if provided
  if (labelIds.length > 0) {
    await supabase.from('issue_labels').insert(
      labelIds.map((labelId) => ({
        issue_id: issue.id,
        label_id: labelId,
      }))
    );
  }

  // Update open issues count
  await supabase
    .from('repositories')
    .update({
      open_issues_count: repository.open_issues_count + 1,
    })
    .eq('id', repositoryId);

  // Get owner username for redirect
  const { data: owner } = await supabase
    .from('users')
    .select('username')
    .eq('id', repository.owner_id)
    .single();

  revalidatePath(`/${owner?.username}/${repository.name}/issues`);

  return { issue: issue as Issue };
}

export async function updateIssue(
  issueId: string,
  updates: Partial<Pick<Issue, 'title' | 'body' | 'state'>>
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Unauthorized' };
  }

  // Get issue to check permissions
  const { data: issue } = await supabase
    .from('issues')
    .select('*, repositories(owner_id, name, users(username))')
    .eq('id', issueId)
    .single();

  if (!issue) {
    return { error: 'Issue not found' };
  }

  // Check if user can edit (author, repo owner, or collaborator with write access)
  const isAuthor = issue.author_id === user.id;
  const isOwner = (issue.repositories as any)?.owner_id === user.id;

  if (!isAuthor && !isOwner) {
    // Check collaborator access
    const { data: collaborator } = await supabase
      .from('repository_collaborators')
      .select('permission')
      .eq('repository_id', issue.repository_id)
      .eq('user_id', user.id)
      .single();

    if (!collaborator || !['write', 'admin'].includes(collaborator.permission)) {
      return { error: 'You do not have permission to edit this issue' };
    }
  }

  // Track state change for open_issues_count
  const stateChanged = updates.state && updates.state !== issue.state;
  const wasOpen = issue.state === 'open';
  const isNowOpen = updates.state === 'open';

  const { error } = await supabase
    .from('issues')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
      ...(updates.state === 'closed' ? { closed_at: new Date().toISOString() } : {}),
    })
    .eq('id', issueId);

  if (error) {
    return { error: 'Failed to update issue' };
  }

  // Update open issues count if state changed
  if (stateChanged) {
    const { data: repo } = await supabase
      .from('repositories')
      .select('open_issues_count')
      .eq('id', issue.repository_id)
      .single();

    if (repo) {
      const newCount = wasOpen
        ? Math.max(0, repo.open_issues_count - 1)
        : repo.open_issues_count + 1;

      await supabase
        .from('repositories')
        .update({ open_issues_count: newCount })
        .eq('id', issue.repository_id);
    }
  }

  revalidatePath('/');
  return { success: true };
}

export async function addComment(
  issueId: string,
  formData: FormData
): Promise<{ error?: string; comment?: IssueComment }> {
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

  // Get issue to verify it exists
  const { data: issue } = await supabase
    .from('issues')
    .select('id, repository_id')
    .eq('id', issueId)
    .single();

  if (!issue) {
    return { error: 'Issue not found' };
  }

  const { data: comment, error } = await supabase
    .from('comments')
    .insert({
      issue_id: issueId,
      author_id: user.id,
      body: body.trim(),
    })
    .select()
    .single();

  if (error) {
    return { error: 'Failed to add comment' };
  }

  // Update issue's updated_at
  await supabase
    .from('issues')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', issueId);

  revalidatePath('/');
  return { comment: comment as IssueComment };
}

export async function getIssue(
  owner: string,
  repo: string,
  number: number
): Promise<Issue | null> {
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

  const { data: issue } = await supabase
    .from('issues')
    .select(`
      *,
      author:users!issues_author_id_fkey(id, username, display_name, avatar_url),
      assignees:issue_assignees(user:users(id, username, display_name, avatar_url)),
      labels:issue_labels(label:labels(*))
    `)
    .eq('repository_id', repository.id)
    .eq('number', number)
    .single();

  return issue as Issue | null;
}

export async function getIssues(
  owner: string,
  repo: string,
  options: {
    state?: 'open' | 'closed' | 'all';
    label?: string;
    page?: number;
    perPage?: number;
  } = {}
): Promise<{ issues: Issue[]; total: number }> {
  const supabase = await createClient();

  const { state = 'open', label, page = 1, perPage = 25 } = options;

  // Find repository
  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('username', owner)
    .single();

  if (!user) return { issues: [], total: 0 };

  const { data: repository } = await supabase
    .from('repositories')
    .select('id')
    .eq('owner_id', user.id)
    .eq('name', repo)
    .single();

  if (!repository) return { issues: [], total: 0 };

  let query = supabase
    .from('issues')
    .select(`
      *,
      author:users!issues_author_id_fkey(id, username, display_name, avatar_url),
      labels:issue_labels(label:labels(*))
    `, { count: 'exact' })
    .eq('repository_id', repository.id);

  if (state !== 'all') {
    query = query.eq('state', state);
  }

  // Filter by label if provided
  if (label) {
    const { data: labelData } = await supabase
      .from('labels')
      .select('id')
      .eq('repository_id', repository.id)
      .eq('name', label)
      .single();

    if (labelData) {
      const { data: issueIds } = await supabase
        .from('issue_labels')
        .select('issue_id')
        .eq('label_id', labelData.id);

      if (issueIds) {
        query = query.in('id', issueIds.map((i) => i.issue_id));
      }
    }
  }

  const { data: issues, count } = await query
    .order('created_at', { ascending: false })
    .range((page - 1) * perPage, page * perPage - 1);

  return {
    issues: (issues as Issue[]) || [],
    total: count || 0,
  };
}

export async function getLabels(repositoryId: string): Promise<Label[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from('labels')
    .select('*')
    .eq('repository_id', repositoryId)
    .order('name');

  return (data as Label[]) || [];
}

export async function addLabelsToIssue(issueId: string, labelIds: string[]) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Unauthorized' };
  }

  // Remove existing labels
  await supabase.from('issue_labels').delete().eq('issue_id', issueId);

  // Add new labels
  if (labelIds.length > 0) {
    await supabase.from('issue_labels').insert(
      labelIds.map((labelId) => ({
        issue_id: issueId,
        label_id: labelId,
      }))
    );
  }

  revalidatePath('/');
  return { success: true };
}

export async function getIssueComments(issueId: string): Promise<IssueComment[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from('comments')
    .select(`
      *,
      author:users!comments_author_id_fkey(id, username, display_name, avatar_url)
    `)
    .eq('issue_id', issueId)
    .order('created_at', { ascending: true });

  return (data as IssueComment[]) || [];
}
