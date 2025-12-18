'use server';

import { createClient, createServiceClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { nanoid } from 'nanoid';
import type { Repository, RepositoryVisibility } from '@/types';
import { initRepository, getGitRepository } from '@/lib/git';
import { copyRepositoryStorage } from '@/lib/storage';

export async function createRepository(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'You must be logged in to create a repository' };
  }

  const name = formData.get('name') as string;
  const description = formData.get('description') as string | null;
  const visibility = formData.get('visibility') as RepositoryVisibility;
  const initReadme = formData.get('init_readme') === 'true';

  // Validate repository name
  if (!name || !/^[a-zA-Z0-9._-]+$/.test(name)) {
    return { error: 'Invalid repository name. Use only letters, numbers, dots, hyphens, and underscores.' };
  }

  if (name.length > 100) {
    return { error: 'Repository name must be 100 characters or less' };
  }

  // Get user profile
  const { data: userProfile } = await supabase
    .from('users')
    .select('username')
    .eq('id', user.id)
    .single();

  if (!userProfile) {
    return { error: 'User profile not found' };
  }

  // Check if repository already exists
  const { data: existingRepo } = await supabase
    .from('repositories')
    .select('id')
    .eq('owner_id', user.id)
    .eq('name', name)
    .single();

  if (existingRepo) {
    return { error: 'A repository with this name already exists' };
  }

  // Generate storage path
  const storagePath = `repos/${user.id}/${nanoid()}`;

  // Create repository in database
  const { data: repo, error } = await supabase
    .from('repositories')
    .insert({
      owner_type: 'user',
      owner_id: user.id,
      name,
      description,
      visibility,
      storage_path: storagePath,
      default_branch: 'main',
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating repository:', error);
    return { error: 'Failed to create repository' };
  }

  // Create default labels
  const defaultLabels = [
    { name: 'bug', color: 'd73a4a', description: 'Something isn\'t working' },
    { name: 'documentation', color: '0075ca', description: 'Improvements or additions to documentation' },
    { name: 'duplicate', color: 'cfd3d7', description: 'This issue or pull request already exists' },
    { name: 'enhancement', color: 'a2eeef', description: 'New feature or request' },
    { name: 'good first issue', color: '7057ff', description: 'Good for newcomers' },
    { name: 'help wanted', color: '008672', description: 'Extra attention is needed' },
    { name: 'invalid', color: 'e4e669', description: 'This doesn\'t seem right' },
    { name: 'question', color: 'd876e3', description: 'Further information is requested' },
    { name: 'wontfix', color: 'ffffff', description: 'This will not be worked on' },
  ];

  await supabase.from('labels').insert(
    defaultLabels.map((label) => ({
      repository_id: repo.id,
      ...label,
    }))
  );

  // Always initialize git repository
  try {
    const gitRepo = await initRepository(storagePath, 'main');

    // If initReadme is true, create initial commit with README
    if (initReadme) {
      await gitRepo.createInitialCommit(
        name,
        description,
        { name: userProfile.username, email: user.email || `${userProfile.username}@gitforge.local` }
      );
    }
  } catch (error) {
    console.error('Error initializing git repository:', error);
    // Continue even if git init fails - user can push later
  }

  revalidatePath(`/${userProfile.username}`);
  redirect(`/${userProfile.username}/${name}`);
}

export async function getRepository(owner: string, name: string): Promise<Repository | null> {
  const supabase = await createClient();

  // First, find the owner (user or org)
  const { data: userOwner } = await supabase
    .from('users')
    .select('id')
    .eq('username', owner)
    .single();

  let ownerId = userOwner?.id;
  let ownerType: 'user' | 'organization' = 'user';

  if (!ownerId) {
    const { data: orgOwner } = await supabase
      .from('organizations')
      .select('id')
      .eq('slug', owner)
      .single();

    if (orgOwner) {
      ownerId = orgOwner.id;
      ownerType = 'organization';
    }
  }

  if (!ownerId) {
    return null;
  }

  const { data: repo } = await supabase
    .from('repositories')
    .select('*')
    .eq('owner_id', ownerId)
    .eq('name', name)
    .single();

  return repo as Repository | null;
}

export async function getUserRepositories(username: string): Promise<Repository[]> {
  const supabase = await createClient();

  // Get user ID
  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('username', username)
    .single();

  if (!user) {
    return [];
  }

  const { data: repos } = await supabase
    .from('repositories')
    .select('*')
    .eq('owner_id', user.id)
    .eq('owner_type', 'user')
    .order('updated_at', { ascending: false });

  return (repos as Repository[]) || [];
}

export async function updateRepository(
  repositoryId: string,
  updates: Partial<Pick<Repository, 'name' | 'description' | 'visibility' | 'default_branch' | 'has_issues' | 'has_pull_requests' | 'is_archived'>>
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Unauthorized' };
  }

  // Check if user has admin access
  const { data: repo } = await supabase
    .from('repositories')
    .select('owner_id, owner_type')
    .eq('id', repositoryId)
    .single();

  if (!repo) {
    return { error: 'Repository not found' };
  }

  if (repo.owner_type === 'user' && repo.owner_id !== user.id) {
    // Check for collaborator access
    const { data: collaborator } = await supabase
      .from('repository_collaborators')
      .select('permission')
      .eq('repository_id', repositoryId)
      .eq('user_id', user.id)
      .single();

    if (!collaborator || collaborator.permission !== 'admin') {
      return { error: 'You do not have permission to update this repository' };
    }
  }

  const { error } = await supabase
    .from('repositories')
    .update(updates)
    .eq('id', repositoryId);

  if (error) {
    return { error: 'Failed to update repository' };
  }

  revalidatePath('/');
  return { success: true };
}

export async function deleteRepository(repositoryId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Unauthorized' };
  }

  // Get repository details
  const { data: repo } = await supabase
    .from('repositories')
    .select('owner_id, owner_type, storage_path')
    .eq('id', repositoryId)
    .single();

  if (!repo) {
    return { error: 'Repository not found' };
  }

  // Only owner can delete
  if (repo.owner_type === 'user' && repo.owner_id !== user.id) {
    return { error: 'Only the owner can delete this repository' };
  }

  // Delete from database (cascade will handle related records)
  const { error } = await supabase
    .from('repositories')
    .delete()
    .eq('id', repositoryId);

  if (error) {
    return { error: 'Failed to delete repository' };
  }

  // TODO: Delete files from storage
  // await deleteStorageFolder(repo.storage_path);

  revalidatePath('/');
  return { success: true };
}

export async function starRepository(repositoryId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'You must be logged in to star a repository' };
  }

  // Check if already starred
  const { data: existingStar } = await supabase
    .from('stars')
    .select('id')
    .eq('user_id', user.id)
    .eq('repository_id', repositoryId)
    .single();

  if (existingStar) {
    // Unstar
    await supabase
      .from('stars')
      .delete()
      .eq('id', existingStar.id);
  } else {
    // Star
    await supabase.from('stars').insert({
      user_id: user.id,
      repository_id: repositoryId,
    });
  }

  revalidatePath('/');
  return { success: true };
}

export async function forkRepository(repositoryId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'You must be logged in to fork a repository' };
  }

  // Get original repository
  const { data: originalRepo } = await supabase
    .from('repositories')
    .select('*')
    .eq('id', repositoryId)
    .single();

  if (!originalRepo) {
    return { error: 'Repository not found' };
  }

  // Get user profile
  const { data: userProfile } = await supabase
    .from('users')
    .select('username')
    .eq('id', user.id)
    .single();

  if (!userProfile) {
    return { error: 'User profile not found' };
  }

  // Check if fork already exists
  const { data: existingFork } = await supabase
    .from('repositories')
    .select('id')
    .eq('owner_id', user.id)
    .eq('name', originalRepo.name)
    .single();

  if (existingFork) {
    return { error: 'You already have a fork of this repository' };
  }

  // Generate storage path for fork
  const storagePath = `repos/${user.id}/${nanoid()}`;

  // Create forked repository
  const { data: forkedRepo, error } = await supabase
    .from('repositories')
    .insert({
      owner_type: 'user',
      owner_id: user.id,
      name: originalRepo.name,
      description: originalRepo.description,
      visibility: originalRepo.visibility,
      default_branch: originalRepo.default_branch,
      is_fork: true,
      forked_from_id: repositoryId,
      storage_path: storagePath,
    })
    .select()
    .single();

  if (error) {
    return { error: 'Failed to fork repository' };
  }

  // Update fork count on original
  await supabase
    .from('repositories')
    .update({ forks_count: (originalRepo.forks_count || 0) + 1 })
    .eq('id', repositoryId);

  // Copy git objects from original to fork
  try {
    await copyRepositoryStorage(originalRepo.storage_path, storagePath);
  } catch (error) {
    console.error('Error copying repository storage:', error);
    // Don't fail the fork if copy fails - user can push to it
  }

  revalidatePath('/');
  redirect(`/${userProfile.username}/${forkedRepo.name}`);
}
