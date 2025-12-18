'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export interface Notification {
  id: string;
  user_id: string;
  type: 'issue' | 'pull_request' | 'comment' | 'mention' | 'review' | 'star' | 'follow';
  title: string;
  body: string | null;
  url: string;
  read: boolean;
  actor_id: string | null;
  repository_id: string | null;
  created_at: string;
  actor?: {
    id: string;
    username: string;
    avatar_url: string | null;
  };
  repository?: {
    name: string;
    owner: {
      username: string;
    };
  };
}

export async function getNotifications(options: {
  unreadOnly?: boolean;
  page?: number;
  perPage?: number;
} = {}): Promise<{ notifications: Notification[]; unreadCount: number }> {
  const supabase = await createClient();
  const { unreadOnly = false, page = 1, perPage = 20 } = options;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { notifications: [], unreadCount: 0 };
  }

  let query = supabase
    .from('notifications')
    .select(`
      *,
      actor:users!notifications_actor_id_fkey(id, username, avatar_url),
      repository:repositories(name, owner:users!repositories_owner_id_fkey(username))
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (unreadOnly) {
    query = query.eq('read', false);
  }

  const offset = (page - 1) * perPage;
  const { data: notifications } = await query.range(offset, offset + perPage - 1);

  // Get unread count
  const { count } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('read', false);

  return {
    notifications: (notifications as Notification[]) || [],
    unreadCount: count || 0,
  };
}

export async function markAsRead(notificationId: string): Promise<void> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return;
  }

  await supabase
    .from('notifications')
    .update({ read: true })
    .eq('id', notificationId)
    .eq('user_id', user.id);

  revalidatePath('/notifications');
}

export async function markAllAsRead(): Promise<void> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return;
  }

  await supabase
    .from('notifications')
    .update({ read: true })
    .eq('user_id', user.id)
    .eq('read', false);

  revalidatePath('/notifications');
}

export async function deleteNotification(notificationId: string): Promise<void> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return;
  }

  await supabase
    .from('notifications')
    .delete()
    .eq('id', notificationId)
    .eq('user_id', user.id);

  revalidatePath('/notifications');
}

// Helper to create notifications (called from other actions)
export async function createNotification({
  userId,
  type,
  title,
  body,
  url,
  actorId,
  repositoryId,
}: {
  userId: string;
  type: Notification['type'];
  title: string;
  body?: string;
  url: string;
  actorId?: string;
  repositoryId?: string;
}) {
  const supabase = await createClient();

  // Don't notify yourself
  if (actorId && userId === actorId) {
    return;
  }

  await supabase.from('notifications').insert({
    user_id: userId,
    type,
    title,
    body: body || null,
    url,
    actor_id: actorId || null,
    repository_id: repositoryId || null,
    read: false,
  });
}

export async function getUnreadCount(): Promise<number> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return 0;
  }

  const { count } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('read', false);

  return count || 0;
}
