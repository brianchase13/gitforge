'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { Template, TemplateType } from '@/types';

export async function getTemplates(
  repositoryId: string,
  templateType?: TemplateType
): Promise<Template[]> {
  const supabase = await createClient();

  let query = supabase
    .from('templates')
    .select('*')
    .eq('repository_id', repositoryId)
    .order('name');

  if (templateType) {
    query = query.eq('template_type', templateType);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching templates:', error);
    return [];
  }

  return data as Template[];
}

export async function getTemplate(templateId: string): Promise<Template | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('templates')
    .select('*')
    .eq('id', templateId)
    .single();

  if (error) {
    console.error('Error fetching template:', error);
    return null;
  }

  return data as Template;
}

export async function createTemplate(
  repositoryId: string,
  templateType: TemplateType,
  name: string,
  body: string,
  options?: {
    description?: string;
    titleTemplate?: string;
    labels?: string[];
    assignees?: string[];
  }
): Promise<{ error?: string; template?: Template }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'You must be logged in to create templates' };
  }

  // Check if user has permission to create templates in this repository
  const { data: repository } = await supabase
    .from('repositories')
    .select('owner_id')
    .eq('id', repositoryId)
    .single();

  if (!repository) {
    return { error: 'Repository not found' };
  }

  const { data: collaborator } = await supabase
    .from('repository_collaborators')
    .select('permission')
    .eq('repository_id', repositoryId)
    .eq('user_id', user.id)
    .single();

  const isOwner = repository.owner_id === user.id;
  const isMaintainer = collaborator?.permission === 'maintain' || collaborator?.permission === 'admin';

  if (!isOwner && !isMaintainer) {
    return { error: 'You do not have permission to create templates in this repository' };
  }

  const { data, error } = await supabase
    .from('templates')
    .insert({
      repository_id: repositoryId,
      template_type: templateType,
      name,
      description: options?.description || null,
      title_template: options?.titleTemplate || null,
      body,
      labels: options?.labels || [],
      assignees: options?.assignees || [],
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating template:', error);
    if (error.code === '23505') {
      return { error: 'A template with this name already exists' };
    }
    return { error: 'Failed to create template' };
  }

  revalidatePath('/');
  return { template: data as Template };
}

export async function updateTemplate(
  templateId: string,
  updates: {
    name?: string;
    description?: string;
    titleTemplate?: string;
    body?: string;
    labels?: string[];
    assignees?: string[];
  }
): Promise<{ error?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'You must be logged in to update templates' };
  }

  // Get template and check permissions
  const { data: template } = await supabase
    .from('templates')
    .select('repository_id')
    .eq('id', templateId)
    .single();

  if (!template) {
    return { error: 'Template not found' };
  }

  // Check if user has permission
  const { data: repository } = await supabase
    .from('repositories')
    .select('owner_id')
    .eq('id', template.repository_id)
    .single();

  if (!repository) {
    return { error: 'Repository not found' };
  }

  const { data: collaborator } = await supabase
    .from('repository_collaborators')
    .select('permission')
    .eq('repository_id', template.repository_id)
    .eq('user_id', user.id)
    .single();

  const isOwner = repository.owner_id === user.id;
  const isMaintainer = collaborator?.permission === 'maintain' || collaborator?.permission === 'admin';

  if (!isOwner && !isMaintainer) {
    return { error: 'You do not have permission to update this template' };
  }

  const updateData: Record<string, any> = {
    updated_at: new Date().toISOString(),
  };

  if (updates.name !== undefined) updateData.name = updates.name;
  if (updates.description !== undefined) updateData.description = updates.description;
  if (updates.titleTemplate !== undefined) updateData.title_template = updates.titleTemplate;
  if (updates.body !== undefined) updateData.body = updates.body;
  if (updates.labels !== undefined) updateData.labels = updates.labels;
  if (updates.assignees !== undefined) updateData.assignees = updates.assignees;

  const { error } = await supabase
    .from('templates')
    .update(updateData)
    .eq('id', templateId);

  if (error) {
    console.error('Error updating template:', error);
    return { error: 'Failed to update template' };
  }

  revalidatePath('/');
  return {};
}

export async function deleteTemplate(templateId: string): Promise<{ error?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'You must be logged in to delete templates' };
  }

  // Get template and check permissions
  const { data: template } = await supabase
    .from('templates')
    .select('repository_id')
    .eq('id', templateId)
    .single();

  if (!template) {
    return { error: 'Template not found' };
  }

  // Check if user has permission
  const { data: repository } = await supabase
    .from('repositories')
    .select('owner_id')
    .eq('id', template.repository_id)
    .single();

  if (!repository) {
    return { error: 'Repository not found' };
  }

  const { data: collaborator } = await supabase
    .from('repository_collaborators')
    .select('permission')
    .eq('repository_id', template.repository_id)
    .eq('user_id', user.id)
    .single();

  const isOwner = repository.owner_id === user.id;
  const isMaintainer = collaborator?.permission === 'maintain' || collaborator?.permission === 'admin';

  if (!isOwner && !isMaintainer) {
    return { error: 'You do not have permission to delete this template' };
  }

  const { error } = await supabase.from('templates').delete().eq('id', templateId);

  if (error) {
    console.error('Error deleting template:', error);
    return { error: 'Failed to delete template' };
  }

  revalidatePath('/');
  return {};
}
