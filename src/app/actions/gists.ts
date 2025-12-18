'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { Gist, GistFile, GistVisibility } from '@/types';

export async function getPublicGists(limit = 20, offset = 0): Promise<Gist[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('gists')
    .select(`
      *,
      author:users!gists_author_id_fkey(id, username, avatar_url),
      files:gist_files(id, filename, language, size_bytes)
    `)
    .eq('visibility', 'public')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error('Error fetching gists:', error);
    return [];
  }

  return data as Gist[];
}

export async function getUserGists(username: string): Promise<Gist[]> {
  const supabase = await createClient();

  // Get user ID from username
  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('username', username)
    .single();

  if (!user) {
    return [];
  }

  // Get current user to check if viewing own gists
  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser();

  const isOwner = currentUser?.id === user.id;

  let query = supabase
    .from('gists')
    .select(`
      *,
      author:users!gists_author_id_fkey(id, username, avatar_url),
      files:gist_files(id, filename, language, size_bytes)
    `)
    .eq('author_id', user.id)
    .order('created_at', { ascending: false });

  if (!isOwner) {
    query = query.eq('visibility', 'public');
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching user gists:', error);
    return [];
  }

  return data as Gist[];
}

export async function getGist(gistId: string): Promise<Gist | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('gists')
    .select(`
      *,
      author:users!gists_author_id_fkey(id, username, avatar_url),
      files:gist_files(id, filename, content, language, size_bytes, created_at, updated_at)
    `)
    .eq('id', gistId)
    .single();

  if (error) {
    if (error.code !== 'PGRST116') {
      console.error('Error fetching gist:', error);
    }
    return null;
  }

  return data as Gist;
}

export async function createGist(
  files: { filename: string; content: string }[],
  options?: {
    description?: string;
    visibility?: GistVisibility;
  }
): Promise<{ error?: string; gist?: Gist }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'You must be logged in to create gists' };
  }

  if (files.length === 0) {
    return { error: 'At least one file is required' };
  }

  // Validate filenames
  for (const file of files) {
    if (!file.filename || !file.filename.trim()) {
      return { error: 'All files must have a filename' };
    }
  }

  // Create the gist
  const { data: gist, error: gistError } = await supabase
    .from('gists')
    .insert({
      author_id: user.id,
      description: options?.description || null,
      visibility: options?.visibility || 'public',
      files_count: files.length,
    })
    .select()
    .single();

  if (gistError) {
    console.error('Error creating gist:', gistError);
    return { error: 'Failed to create gist' };
  }

  // Add files
  const filesToInsert = files.map((file) => ({
    gist_id: gist.id,
    filename: file.filename,
    content: file.content,
    language: detectLanguage(file.filename),
    size_bytes: new Blob([file.content]).size,
  }));

  const { error: filesError } = await supabase
    .from('gist_files')
    .insert(filesToInsert);

  if (filesError) {
    console.error('Error creating gist files:', filesError);
    // Clean up the gist
    await supabase.from('gists').delete().eq('id', gist.id);
    return { error: 'Failed to create gist files' };
  }

  revalidatePath('/');
  return { gist: gist as Gist };
}

export async function updateGist(
  gistId: string,
  files: { id?: string; filename: string; content: string }[],
  options?: {
    description?: string;
    visibility?: GistVisibility;
  }
): Promise<{ error?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'You must be logged in to update gists' };
  }

  // Check ownership
  const { data: gist } = await supabase
    .from('gists')
    .select('author_id')
    .eq('id', gistId)
    .single();

  if (!gist) {
    return { error: 'Gist not found' };
  }

  if (gist.author_id !== user.id) {
    return { error: 'You do not have permission to update this gist' };
  }

  // Update gist metadata
  const updateData: Record<string, any> = {
    updated_at: new Date().toISOString(),
    files_count: files.length,
  };

  if (options?.description !== undefined) updateData.description = options.description;
  if (options?.visibility !== undefined) updateData.visibility = options.visibility;

  const { error: gistError } = await supabase
    .from('gists')
    .update(updateData)
    .eq('id', gistId);

  if (gistError) {
    console.error('Error updating gist:', gistError);
    return { error: 'Failed to update gist' };
  }

  // Delete existing files and re-create
  await supabase.from('gist_files').delete().eq('gist_id', gistId);

  const filesToInsert = files.map((file) => ({
    gist_id: gistId,
    filename: file.filename,
    content: file.content,
    language: detectLanguage(file.filename),
    size_bytes: new Blob([file.content]).size,
  }));

  const { error: filesError } = await supabase
    .from('gist_files')
    .insert(filesToInsert);

  if (filesError) {
    console.error('Error updating gist files:', filesError);
    return { error: 'Failed to update gist files' };
  }

  revalidatePath('/');
  return {};
}

export async function deleteGist(gistId: string): Promise<{ error?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'You must be logged in to delete gists' };
  }

  // Check ownership
  const { data: gist } = await supabase
    .from('gists')
    .select('author_id')
    .eq('id', gistId)
    .single();

  if (!gist) {
    return { error: 'Gist not found' };
  }

  if (gist.author_id !== user.id) {
    return { error: 'You do not have permission to delete this gist' };
  }

  const { error } = await supabase.from('gists').delete().eq('id', gistId);

  if (error) {
    console.error('Error deleting gist:', error);
    return { error: 'Failed to delete gist' };
  }

  revalidatePath('/');
  return {};
}

// Helper function to detect language from filename
function detectLanguage(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  const languageMap: Record<string, string> = {
    js: 'javascript',
    jsx: 'jsx',
    ts: 'typescript',
    tsx: 'tsx',
    py: 'python',
    rb: 'ruby',
    java: 'java',
    go: 'go',
    rs: 'rust',
    c: 'c',
    cpp: 'cpp',
    h: 'c',
    hpp: 'cpp',
    cs: 'csharp',
    php: 'php',
    swift: 'swift',
    kt: 'kotlin',
    scala: 'scala',
    sql: 'sql',
    html: 'html',
    css: 'css',
    scss: 'scss',
    less: 'less',
    json: 'json',
    xml: 'xml',
    yaml: 'yaml',
    yml: 'yaml',
    md: 'markdown',
    mdx: 'mdx',
    sh: 'bash',
    bash: 'bash',
    zsh: 'bash',
    dockerfile: 'dockerfile',
    makefile: 'makefile',
    txt: 'text',
  };

  return languageMap[ext || ''] || 'text';
}
