'use client';

import Link from 'next/link';
import {
  GitCommit,
  GitPullRequest,
  CircleDot,
  MessageSquare,
  Star,
  GitFork,
  GitBranch,
  BookOpen,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatRelativeTime } from '@/lib/utils';

export interface ActivityEvent {
  id: string;
  type:
    | 'push'
    | 'create_repo'
    | 'fork'
    | 'star'
    | 'issue_open'
    | 'issue_close'
    | 'pr_open'
    | 'pr_merge'
    | 'pr_close'
    | 'comment';
  actor: {
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
  payload?: {
    ref?: string;
    commits?: number;
    issue_number?: number;
    issue_title?: string;
    pr_number?: number;
    pr_title?: string;
    comment_preview?: string;
    forked_from?: string;
  };
  created_at: string;
}

interface ActivityFeedProps {
  events: ActivityEvent[];
  showActor?: boolean;
}

export function ActivityFeed({ events, showActor = true }: ActivityFeedProps) {
  if (events.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No activity to show
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {events.map((event) => (
        <ActivityItem key={event.id} event={event} showActor={showActor} />
      ))}
    </div>
  );
}

function ActivityItem({
  event,
  showActor,
}: {
  event: ActivityEvent;
  showActor: boolean;
}) {
  const getIcon = () => {
    switch (event.type) {
      case 'push':
        return <GitCommit className="h-4 w-4" />;
      case 'create_repo':
        return <BookOpen className="h-4 w-4" />;
      case 'fork':
        return <GitFork className="h-4 w-4" />;
      case 'star':
        return <Star className="h-4 w-4 text-yellow-500" />;
      case 'issue_open':
        return <CircleDot className="h-4 w-4 text-green-600" />;
      case 'issue_close':
        return <CircleDot className="h-4 w-4 text-purple-600" />;
      case 'pr_open':
        return <GitPullRequest className="h-4 w-4 text-green-600" />;
      case 'pr_merge':
        return <GitPullRequest className="h-4 w-4 text-purple-600" />;
      case 'pr_close':
        return <GitPullRequest className="h-4 w-4 text-red-600" />;
      case 'comment':
        return <MessageSquare className="h-4 w-4 text-blue-500" />;
      default:
        return <GitBranch className="h-4 w-4" />;
    }
  };

  const getDescription = () => {
    const repoLink = event.repository && (
      <Link
        href={`/${event.repository.owner.username}/${event.repository.name}`}
        className="font-medium hover:text-primary hover:underline"
      >
        {event.repository.owner.username}/{event.repository.name}
      </Link>
    );

    switch (event.type) {
      case 'push':
        return (
          <>
            pushed {event.payload?.commits || 1} commit
            {(event.payload?.commits || 1) > 1 ? 's' : ''} to{' '}
            <span className="font-mono text-sm">{event.payload?.ref || 'main'}</span> in{' '}
            {repoLink}
          </>
        );
      case 'create_repo':
        return <>created repository {repoLink}</>;
      case 'fork':
        return (
          <>
            forked{' '}
            {event.payload?.forked_from && (
              <Link
                href={`/${event.payload.forked_from}`}
                className="font-medium hover:text-primary hover:underline"
              >
                {event.payload.forked_from}
              </Link>
            )}{' '}
            to {repoLink}
          </>
        );
      case 'star':
        return <>starred {repoLink}</>;
      case 'issue_open':
        return (
          <>
            opened issue{' '}
            <Link
              href={`/${event.repository?.owner.username}/${event.repository?.name}/issues/${event.payload?.issue_number}`}
              className="font-medium hover:text-primary hover:underline"
            >
              #{event.payload?.issue_number}
            </Link>{' '}
            in {repoLink}
          </>
        );
      case 'issue_close':
        return (
          <>
            closed issue{' '}
            <Link
              href={`/${event.repository?.owner.username}/${event.repository?.name}/issues/${event.payload?.issue_number}`}
              className="font-medium hover:text-primary hover:underline"
            >
              #{event.payload?.issue_number}
            </Link>{' '}
            in {repoLink}
          </>
        );
      case 'pr_open':
        return (
          <>
            opened pull request{' '}
            <Link
              href={`/${event.repository?.owner.username}/${event.repository?.name}/pulls/${event.payload?.pr_number}`}
              className="font-medium hover:text-primary hover:underline"
            >
              #{event.payload?.pr_number}
            </Link>{' '}
            in {repoLink}
          </>
        );
      case 'pr_merge':
        return (
          <>
            merged pull request{' '}
            <Link
              href={`/${event.repository?.owner.username}/${event.repository?.name}/pulls/${event.payload?.pr_number}`}
              className="font-medium hover:text-primary hover:underline"
            >
              #{event.payload?.pr_number}
            </Link>{' '}
            in {repoLink}
          </>
        );
      case 'pr_close':
        return (
          <>
            closed pull request{' '}
            <Link
              href={`/${event.repository?.owner.username}/${event.repository?.name}/pulls/${event.payload?.pr_number}`}
              className="font-medium hover:text-primary hover:underline"
            >
              #{event.payload?.pr_number}
            </Link>{' '}
            in {repoLink}
          </>
        );
      case 'comment':
        return (
          <>
            commented on {repoLink}
            {event.payload?.comment_preview && (
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                &quot;{event.payload.comment_preview}&quot;
              </p>
            )}
          </>
        );
      default:
        return <>performed an action in {repoLink}</>;
    }
  };

  return (
    <div className="flex items-start gap-3 text-sm">
      {showActor && (
        <Avatar className="h-8 w-8">
          <AvatarImage src={event.actor.avatar_url || undefined} />
          <AvatarFallback>
            {event.actor.username?.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">{getIcon()}</span>
          {showActor && (
            <Link
              href={`/${event.actor.username}`}
              className="font-medium hover:text-primary hover:underline"
            >
              {event.actor.username}
            </Link>
          )}
          <span className="text-muted-foreground">{getDescription()}</span>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {formatRelativeTime(event.created_at)}
        </p>
      </div>
    </div>
  );
}
