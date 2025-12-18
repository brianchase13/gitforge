import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  Bell,
  CircleDot,
  GitPullRequest,
  MessageSquare,
  AtSign,
  Star,
  UserPlus,
  CheckCircle,
  Check,
  Trash2,
} from 'lucide-react';
import { getUser } from '@/app/actions/auth';
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  type Notification,
} from '@/app/actions/notifications';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { formatRelativeTime } from '@/lib/utils';

export const metadata = {
  title: 'Notifications - GitForge',
  description: 'View your notifications',
};

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const user = await getUser();

  if (!user) {
    redirect('/login?redirect=/notifications');
  }

  const params = await searchParams;
  const filter = params.filter || 'all';
  const { notifications, unreadCount } = await getNotifications({
    unreadOnly: filter === 'unread',
  });

  return (
    <div className="container py-8 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Notifications</h1>
          {unreadCount > 0 && (
            <p className="text-sm text-muted-foreground">
              {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
            </p>
          )}
        </div>
        {unreadCount > 0 && (
          <form action={markAllAsRead}>
            <Button type="submit" variant="outline" size="sm" className="gap-2">
              <Check className="h-4 w-4" />
              Mark all as read
            </Button>
          </form>
        )}
      </div>

      <Tabs defaultValue={filter} className="space-y-4">
        <TabsList>
          <TabsTrigger value="all" asChild>
            <Link href="/notifications">All</Link>
          </TabsTrigger>
          <TabsTrigger value="unread" asChild>
            <Link href="/notifications?filter=unread">
              Unread
              {unreadCount > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {unreadCount}
                </Badge>
              )}
            </Link>
          </TabsTrigger>
        </TabsList>

        <div className="space-y-2">
          {notifications.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Bell className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">
                  {filter === 'unread' ? 'All caught up!' : 'No notifications'}
                </h3>
                <p className="text-muted-foreground">
                  {filter === 'unread'
                    ? "You've read all your notifications."
                    : "You don't have any notifications yet."}
                </p>
              </CardContent>
            </Card>
          ) : (
            notifications.map((notification) => (
              <NotificationItem key={notification.id} notification={notification} />
            ))
          )}
        </div>
      </Tabs>
    </div>
  );
}

function NotificationItem({ notification }: { notification: Notification }) {
  const getIcon = () => {
    switch (notification.type) {
      case 'issue':
        return <CircleDot className="h-5 w-5 text-green-600" />;
      case 'pull_request':
        return <GitPullRequest className="h-5 w-5 text-purple-600" />;
      case 'comment':
        return <MessageSquare className="h-5 w-5 text-blue-600" />;
      case 'mention':
        return <AtSign className="h-5 w-5 text-yellow-600" />;
      case 'review':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'star':
        return <Star className="h-5 w-5 text-yellow-500" />;
      case 'follow':
        return <UserPlus className="h-5 w-5 text-blue-500" />;
      default:
        return <Bell className="h-5 w-5 text-muted-foreground" />;
    }
  };

  return (
    <Card className={notification.read ? 'opacity-60' : ''}>
      <CardContent className="py-4">
        <div className="flex items-start gap-3">
          <div className="shrink-0 mt-1">{getIcon()}</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4">
              <div>
                <Link
                  href={notification.url}
                  className="font-medium hover:text-primary hover:underline"
                >
                  {notification.title}
                </Link>
                {notification.body && (
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                    {notification.body}
                  </p>
                )}
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2">
                  {notification.actor && (
                    <span className="flex items-center gap-1">
                      <Avatar className="h-4 w-4">
                        <AvatarImage src={notification.actor.avatar_url || undefined} />
                        <AvatarFallback className="text-[8px]">
                          {notification.actor.username?.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      {notification.actor.username}
                    </span>
                  )}
                  {notification.repository && (
                    <>
                      <span>in</span>
                      <Link
                        href={`/${notification.repository.owner.username}/${notification.repository.name}`}
                        className="hover:text-primary hover:underline"
                      >
                        {notification.repository.owner.username}/{notification.repository.name}
                      </Link>
                    </>
                  )}
                  <span>{formatRelativeTime(notification.created_at)}</span>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {!notification.read && (
                  <form action={markAsRead.bind(null, notification.id)}>
                    <Button type="submit" variant="ghost" size="icon" className="h-8 w-8">
                      <Check className="h-4 w-4" />
                    </Button>
                  </form>
                )}
                <form action={deleteNotification.bind(null, notification.id)}>
                  <Button type="submit" variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
