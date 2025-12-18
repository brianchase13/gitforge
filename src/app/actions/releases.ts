'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { Release } from '@/types';

export async function getReleases(
  owner: string,
  repoName: string,
  options: {
    includeDrafts?: boolean;
    page?: number;
    perPage?: number;
  } = {}
): Promise<{ releases: Release[]; total: number }> {
  const supabase = await createClient();

  // Get repository ID
  const { data: userOwner } = await supabase
    .from('users')
    .select('id')
    .eq('username', owner)
    .single();

  let ownerId = userOwner?.id;

  if (!ownerId) {
    const { data: orgOwner } = await supabase
      .from('organizations')
      .select('id')
      .eq('slug', owner)
      .single();
    ownerId = orgOwner?.id;
  }

  if (!ownerId) {
    return { releases: [], total: 0 };
  }

  const { data: repo } = await supabase
    .from('repositories')
    .select('id')
    .eq('owner_id', ownerId)
    .eq('name', repoName)
    .single();

  if (!repo) {
    return { releases: [], total: 0 };
  }

  const { page = 1, perPage = 10, includeDrafts = false } = options;
  const offset = (page - 1) * perPage;

  // Build query
  let query = supabase
    .from('releases')
    .select('*, author:users!releases_author_id_fkey(id, username, display_name, avatar_url)', {
      count: 'exact',
    })
    .eq('repository_id', repo.id)
    .order('created_at', { ascending: false })
    .range(offset, offset + perPage - 1);

  if (!includeDrafts) {
    query = query.eq('draft', false);
  }

  const { data: releases, count } = await query;

  return {
    releases: (releases as Release[]) || [],
    total: count || 0,
  };
}

export async function getRelease(
  owner: string,
  repoName: string,
  tagName: string
): Promise<Release | null> {
  const supabase = await createClient();

  // Get repository ID
  const { data: userOwner } = await supabase
    .from('users')
    .select('id')
    .eq('username', owner)
    .single();

  let ownerId = userOwner?.id;

  if (!ownerId) {
    const { data: orgOwner } = await supabase
      .from('organizations')
      .select('id')
      .eq('slug', owner)
      .single();
    ownerId = orgOwner?.id;
  }

  if (!ownerId) {
    return null;
  }

  const { data: repo } = await supabase
    .from('repositories')
    .select('id')
    .eq('owner_id', ownerId)
    .eq('name', repoName)
    .single();

  if (!repo) {
    return null;
  }

  const { data: release } = await supabase
    .from('releases')
    .select('*, author:users!releases_author_id_fkey(id, username, display_name, avatar_url)')
    .eq('repository_id', repo.id)
    .eq('tag_name', tagName)
    .single();

  return release as Release | null;
}

export async function createRelease(
  repositoryId: string,
  data: {
    tagName: string;
    targetCommitish?: string;
    name?: string;
    body?: string;
    draft?: boolean;
    prerelease?: boolean;
  }
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'You must be logged in to create a release' };
  }

  // Get repository details
  const { data: repo } = await supabase
    .from('repositories')
    .select('owner_id, owner_type, name')
    .eq('id', repositoryId)
    .single();

  if (!repo) {
    return { error: 'Repository not found' };
  }

  // Check permissions
  const hasAccess =
    (repo.owner_type === 'user' && repo.owner_id === user.id) ||
    (await checkCollaboratorPermission(supabase, repositoryId, user.id, ['write', 'maintain', 'admin']));

  if (!hasAccess) {
    return { error: 'You do not have permission to create releases' };
  }

  // Check if tag already exists
  const { data: existingRelease } = await supabase
    .from('releases')
    .select('id')
    .eq('repository_id', repositoryId)
    .eq('tag_name', data.tagName)
    .single();

  if (existingRelease) {
    return { error: 'A release with this tag already exists' };
  }

  // Create release
  const { data: release, error } = await supabase
    .from('releases')
    .insert({
      repository_id: repositoryId,
      tag_name: data.tagName,
      target_commitish: data.targetCommitish || 'main',
      name: data.name || data.tagName,
      body: data.body,
      draft: data.draft || false,
      prerelease: data.prerelease || false,
      author_id: user.id,
      published_at: data.draft ? null : new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating release:', error);
    return { error: 'Failed to create release' };
  }

  // Get owner username for path revalidation
  const { data: owner } = await supabase
    .from('users')
    .select('username')
    .eq('id', repo.owner_id)
    .single();

  if (owner) {
    revalidatePath(`/${owner.username}/${repo.name}/releases`);
  }

  return { release };
}

export async function updateRelease(
  releaseId: string,
  data: {
    name?: string;
    body?: string;
    draft?: boolean;
    prerelease?: boolean;
  }
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Unauthorized' };
  }

  // Get release
  const { data: release } = await supabase
    .from('releases')
    .select('repository_id, author_id')
    .eq('id', releaseId)
    .single();

  if (!release) {
    return { error: 'Release not found' };
  }

  // Check permissions
  const { data: repo } = await supabase
    .from('repositories')
    .select('owner_id, owner_type')
    .eq('id', release.repository_id)
    .single();

  const hasAccess =
    release.author_id === user.id ||
    (repo?.owner_type === 'user' && repo?.owner_id === user.id) ||
    (await checkCollaboratorPermission(supabase, release.repository_id, user.id, ['maintain', 'admin']));

  if (!hasAccess) {
    return { error: 'You do not have permission to update this release' };
  }

  // Update release
  const updateData: any = { ...data };
  if (data.draft === false && !release.author_id) {
    updateData.published_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from('releases')
    .update(updateData)
    .eq('id', releaseId);

  if (error) {
    return { error: 'Failed to update release' };
  }

  revalidatePath('/');
  return { success: true };
}

export async function deleteRelease(releaseId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Unauthorized' };
  }

  // Get release
  const { data: release } = await supabase
    .from('releases')
    .select('repository_id, author_id')
    .eq('id', releaseId)
    .single();

  if (!release) {
    return { error: 'Release not found' };
  }

  // Check permissions
  const { data: repo } = await supabase
    .from('repositories')
    .select('owner_id, owner_type')
    .eq('id', release.repository_id)
    .single();

  const hasAccess =
    release.author_id === user.id ||
    (repo?.owner_type === 'user' && repo?.owner_id === user.id);

  if (!hasAccess) {
    return { error: 'You do not have permission to delete this release' };
  }

  const { error } = await supabase.from('releases').delete().eq('id', releaseId);

  if (error) {
    return { error: 'Failed to delete release' };
  }

  revalidatePath('/');
  return { success: true };
}

async function checkCollaboratorPermission(
  supabase: any,
  repositoryId: string,
  userId: string,
  permissions: string[]
): Promise<boolean> {
  const { data: collaborator } = await supabase
    .from('repository_collaborators')
    .select('permission')
    .eq('repository_id', repositoryId)
    .eq('user_id', userId)
    .single();

  return collaborator && permissions.includes(collaborator.permission);
}
