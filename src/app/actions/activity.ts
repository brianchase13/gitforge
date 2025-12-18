'use server';

import { createClient } from '@/lib/supabase/server';
import type { ActivityEvent } from '@/components/activity/ActivityFeed';

export async function getActivityFeed(options: {
  userId?: string;
  repositoryId?: string;
  limit?: number;
} = {}): Promise<ActivityEvent[]> {
  const supabase = await createClient();
  const { userId, repositoryId, limit = 20 } = options;

  let query = supabase
    .from('events')
    .select(`
      id,
      type,
      payload,
      created_at,
      actor:users!events_actor_id_fkey(id, username, avatar_url),
      repository:repositories!events_repository_id_fkey(
        name,
        owner:users!repositories_owner_id_fkey(username)
      )
    `)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (userId) {
    query = query.eq('actor_id', userId);
  }

  if (repositoryId) {
    query = query.eq('repository_id', repositoryId);
  }

  // Only show events from public repositories (unless specifically filtering by repo)
  if (!repositoryId) {
    query = query.eq('repository.visibility', 'public');
  }

  const { data: events } = await query;

  return (events as unknown as ActivityEvent[]) || [];
}

export async function getPublicActivityFeed(limit: number = 20): Promise<ActivityEvent[]> {
  const supabase = await createClient();

  const { data: events } = await supabase
    .from('events')
    .select(`
      id,
      type,
      payload,
      created_at,
      actor:users!events_actor_id_fkey(id, username, avatar_url),
      repository:repositories!events_repository_id_fkey(
        name,
        visibility,
        owner:users!repositories_owner_id_fkey(username)
      )
    `)
    .eq('repository.visibility', 'public')
    .order('created_at', { ascending: false })
    .limit(limit);

  return (events as unknown as ActivityEvent[]) || [];
}

export async function getUserActivityFeed(
  username: string,
  limit: number = 20
): Promise<ActivityEvent[]> {
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

  const { data: events } = await supabase
    .from('events')
    .select(`
      id,
      type,
      payload,
      created_at,
      actor:users!events_actor_id_fkey(id, username, avatar_url),
      repository:repositories!events_repository_id_fkey(
        name,
        visibility,
        owner:users!repositories_owner_id_fkey(username)
      )
    `)
    .eq('actor_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit);

  // Filter to only public repos
  const publicEvents = events?.filter(
    (e: any) => !e.repository || e.repository.visibility === 'public'
  );

  return (publicEvents as unknown as ActivityEvent[]) || [];
}

export async function createActivityEvent({
  actorId,
  repositoryId,
  type,
  payload,
}: {
  actorId: string;
  repositoryId?: string;
  type: ActivityEvent['type'];
  payload?: ActivityEvent['payload'];
}) {
  const supabase = await createClient();

  await supabase.from('events').insert({
    actor_id: actorId,
    repository_id: repositoryId || null,
    type,
    payload: payload || {},
  });
}

export async function getFollowingFeed(limit: number = 30): Promise<ActivityEvent[]> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  // Get users that the current user follows
  const { data: following } = await supabase
    .from('follows')
    .select('following_id')
    .eq('follower_id', user.id);

  if (!following || following.length === 0) {
    return [];
  }

  const followingIds = following.map((f) => f.following_id);

  const { data: events } = await supabase
    .from('events')
    .select(`
      id,
      type,
      payload,
      created_at,
      actor:users!events_actor_id_fkey(id, username, avatar_url),
      repository:repositories!events_repository_id_fkey(
        name,
        visibility,
        owner:users!repositories_owner_id_fkey(username)
      )
    `)
    .in('actor_id', followingIds)
    .order('created_at', { ascending: false })
    .limit(limit);

  // Filter to only public repos
  const publicEvents = events?.filter(
    (e: any) => !e.repository || e.repository.visibility === 'public'
  );

  return (publicEvents as unknown as ActivityEvent[]) || [];
}
