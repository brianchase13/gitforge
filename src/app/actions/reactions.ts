'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { ReactionType, ReactableType, ReactionSummary } from '@/types';

export async function toggleReaction(
  reactableType: ReactableType,
  reactableId: string,
  reaction: ReactionType
): Promise<{ error?: string; added?: boolean }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'You must be logged in to react' };
  }

  // Check if reaction already exists
  const { data: existing } = await supabase
    .from('reactions')
    .select('id')
    .eq('reactable_type', reactableType)
    .eq('reactable_id', reactableId)
    .eq('user_id', user.id)
    .eq('reaction', reaction)
    .single();

  if (existing) {
    // Remove reaction
    const { error } = await supabase
      .from('reactions')
      .delete()
      .eq('id', existing.id);

    if (error) {
      console.error('Error removing reaction:', error);
      return { error: 'Failed to remove reaction' };
    }

    revalidatePath('/');
    return { added: false };
  } else {
    // Add reaction
    const { error } = await supabase.from('reactions').insert({
      reactable_type: reactableType,
      reactable_id: reactableId,
      user_id: user.id,
      reaction,
    });

    if (error) {
      console.error('Error adding reaction:', error);
      return { error: 'Failed to add reaction' };
    }

    revalidatePath('/');
    return { added: true };
  }
}

export async function getReactions(
  reactableType: ReactableType,
  reactableId: string
): Promise<ReactionSummary[]> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: reactions } = await supabase
    .from('reactions')
    .select(`
      reaction,
      user_id,
      users!reactions_user_id_fkey(id, username)
    `)
    .eq('reactable_type', reactableType)
    .eq('reactable_id', reactableId);

  if (!reactions || reactions.length === 0) {
    return [];
  }

  // Group reactions by type
  const grouped = new Map<ReactionType, { users: { id: string; username: string }[]; userReacted: boolean }>();

  for (const r of reactions) {
    const reactionType = r.reaction as ReactionType;
    const userData = r.users as any;

    if (!grouped.has(reactionType)) {
      grouped.set(reactionType, { users: [], userReacted: false });
    }

    const group = grouped.get(reactionType)!;
    group.users.push({
      id: userData.id,
      username: userData.username,
    });

    if (user && r.user_id === user.id) {
      group.userReacted = true;
    }
  }

  // Convert to array and sort by count
  const summaries: ReactionSummary[] = [];
  for (const [reaction, data] of grouped) {
    summaries.push({
      reaction,
      count: data.users.length,
      users: data.users,
      userReacted: data.userReacted,
    });
  }

  // Sort: user's reactions first, then by count
  summaries.sort((a, b) => {
    if (a.userReacted && !b.userReacted) return -1;
    if (!a.userReacted && b.userReacted) return 1;
    return b.count - a.count;
  });

  return summaries;
}

// Helper to get all reactions for multiple items at once (for list views)
export async function getReactionsForMany(
  reactableType: ReactableType,
  reactableIds: string[]
): Promise<Map<string, ReactionSummary[]>> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (reactableIds.length === 0) {
    return new Map();
  }

  const { data: reactions } = await supabase
    .from('reactions')
    .select(`
      reactable_id,
      reaction,
      user_id,
      users!reactions_user_id_fkey(id, username)
    `)
    .eq('reactable_type', reactableType)
    .in('reactable_id', reactableIds);

  if (!reactions || reactions.length === 0) {
    return new Map();
  }

  // Group by reactable_id, then by reaction type
  const result = new Map<string, ReactionSummary[]>();

  for (const id of reactableIds) {
    const itemReactions = reactions.filter(r => r.reactable_id === id);
    const grouped = new Map<ReactionType, { users: { id: string; username: string }[]; userReacted: boolean }>();

    for (const r of itemReactions) {
      const reactionType = r.reaction as ReactionType;
      const userData = r.users as any;

      if (!grouped.has(reactionType)) {
        grouped.set(reactionType, { users: [], userReacted: false });
      }

      const group = grouped.get(reactionType)!;
      group.users.push({
        id: userData.id,
        username: userData.username,
      });

      if (user && r.user_id === user.id) {
        group.userReacted = true;
      }
    }

    const summaries: ReactionSummary[] = [];
    for (const [reaction, data] of grouped) {
      summaries.push({
        reaction,
        count: data.users.length,
        users: data.users,
        userReacted: data.userReacted,
      });
    }

    summaries.sort((a, b) => {
      if (a.userReacted && !b.userReacted) return -1;
      if (!a.userReacted && b.userReacted) return 1;
      return b.count - a.count;
    });

    result.set(id, summaries);
  }

  return result;
}
