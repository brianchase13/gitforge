'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { WikiPage } from '@/types';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

export async function getWikiPages(repositoryId: string): Promise<WikiPage[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('wiki_pages')
    .select(`
      *,
      author:users!wiki_pages_author_id_fkey(id, username, avatar_url)
    `)
    .eq('repository_id', repositoryId)
    .order('title');

  if (error) {
    console.error('Error fetching wiki pages:', error);
    return [];
  }

  return data as WikiPage[];
}

export async function getWikiPage(
  repositoryId: string,
  slug: string
): Promise<WikiPage | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('wiki_pages')
    .select(`
      *,
      author:users!wiki_pages_author_id_fkey(id, username, avatar_url),
      last_editor:users!wiki_pages_last_editor_id_fkey(id, username, avatar_url)
    `)
    .eq('repository_id', repositoryId)
    .eq('slug', slug)
    .single();

  if (error) {
    if (error.code !== 'PGRST116') {
      console.error('Error fetching wiki page:', error);
    }
    return null;
  }

  return data as WikiPage;
}

export async function createWikiPage(
  repositoryId: string,
  title: string,
  body: string,
  customSlug?: string
): Promise<{ error?: string; page?: WikiPage }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'You must be logged in to create wiki pages' };
  }

  const slug = customSlug || slugify(title);

  if (!slug) {
    return { error: 'Invalid page title' };
  }

  // Check if page already exists
  const { data: existing } = await supabase
    .from('wiki_pages')
    .select('id')
    .eq('repository_id', repositoryId)
    .eq('slug', slug)
    .single();

  if (existing) {
    return { error: 'A page with this title already exists' };
  }

  const { data, error } = await supabase
    .from('wiki_pages')
    .insert({
      repository_id: repositoryId,
      slug,
      title,
      body,
      author_id: user.id,
      last_editor_id: user.id,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating wiki page:', error);
    return { error: 'Failed to create wiki page' };
  }

  revalidatePath('/');
  return { page: data as WikiPage };
}

export async function updateWikiPage(
  pageId: string,
  updates: {
    title?: string;
    body?: string;
    slug?: string;
  }
): Promise<{ error?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'You must be logged in to update wiki pages' };
  }

  const updateData: Record<string, any> = {
    last_editor_id: user.id,
    updated_at: new Date().toISOString(),
  };

  if (updates.title !== undefined) updateData.title = updates.title;
  if (updates.body !== undefined) updateData.body = updates.body;
  if (updates.slug !== undefined) updateData.slug = updates.slug;

  const { error } = await supabase
    .from('wiki_pages')
    .update(updateData)
    .eq('id', pageId);

  if (error) {
    console.error('Error updating wiki page:', error);
    if (error.code === '23505') {
      return { error: 'A page with this slug already exists' };
    }
    return { error: 'Failed to update wiki page' };
  }

  revalidatePath('/');
  return {};
}

export async function deleteWikiPage(pageId: string): Promise<{ error?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'You must be logged in to delete wiki pages' };
  }

  const { error } = await supabase.from('wiki_pages').delete().eq('id', pageId);

  if (error) {
    console.error('Error deleting wiki page:', error);
    return { error: 'Failed to delete wiki page' };
  }

  revalidatePath('/');
  return {};
}
