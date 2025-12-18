import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  GitPullRequest,
  GitMerge,
  XCircle,
  MessageSquare,
  Search,
  Plus,
} from 'lucide-react';
import { getRepository } from '@/app/actions/repositories';
import { getPullRequests } from '@/app/actions/pull-requests';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatRelativeTime } from '@/lib/utils';

interface PullsPageProps {
  params: Promise<{
    username: string;
    repo: string;
  }>;
  searchParams: Promise<{
    state?: string;
    page?: string;
  }>;
}

export default async function PullsPage({
  params,
  searchParams,
}: PullsPageProps) {
  const { username, repo: repoName } = await params;
  const { state = 'open', page: pageParam } = await searchParams;

  const repository = await getRepository(username, repoName);

  if (!repository || !repository.has_pull_requests) {
    notFound();
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const page = parseInt(pageParam || '1');
  const perPage = 25;

  const { pullRequests, total } = await getPullRequests(username, repoName, {
    state: state as 'open' | 'closed' | 'merged' | 'all',
    page,
    perPage,
  });

  // Get counts
  const { pullRequests: openPRs } = await getPullRequests(username, repoName, { state: 'open' });
  const { pullRequests: closedPRs } = await getPullRequests(username, repoName, { state: 'closed' });
  const { pullRequests: mergedPRs } = await getPullRequests(username, repoName, { state: 'merged' });

  const totalPages = Math.ceil(total / perPage);

  return (
    <div className="container py-6">
      {/* Filters bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-2">
          <Link href={`/${username}/${repoName}/pulls?state=open`}>
            <Button
              variant={state === 'open' ? 'secondary' : 'ghost'}
              size="sm"
              className="gap-2"
            >
              <GitPullRequest className="h-4 w-4" />
              {openPRs.length} Open
            </Button>
          </Link>
          <Link href={`/${username}/${repoName}/pulls?state=merged`}>
            <Button
              variant={state === 'merged' ? 'secondary' : 'ghost'}
              size="sm"
              className="gap-2"
            >
              <GitMerge className="h-4 w-4" />
              {mergedPRs.length} Merged
            </Button>
          </Link>
          <Link href={`/${username}/${repoName}/pulls?state=closed`}>
            <Button
              variant={state === 'closed' ? 'secondary' : 'ghost'}
              size="sm"
              className="gap-2"
            >
              <XCircle className="h-4 w-4" />
              {closedPRs.length} Closed
            </Button>
          </Link>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search pull requests..."
              className="pl-10 w-64"
            />
          </div>
          {user && (
            <Link href={`/${username}/${repoName}/pulls/new`}>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                New pull request
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Pull requests list */}
      {pullRequests.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <GitPullRequest className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">
              {state === 'open'
                ? 'No open pull requests'
                : state === 'merged'
                ? 'No merged pull requests'
                : state === 'closed'
                ? 'No closed pull requests'
                : 'No pull requests'}
            </h3>
            <p className="text-muted-foreground mb-4">
              Pull requests help you collaborate on code changes.
            </p>
            {user && (
              <Link href={`/${username}/${repoName}/pulls/new`}>
                <Button>Create a pull request</Button>
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0 divide-y">
            {pullRequests.map((pr) => (
              <PRRow
                key={pr.id}
                pullRequest={pr}
                username={username}
                repoName={repoName}
              />
            ))}
          </CardContent>
        </Card>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          {page > 1 && (
            <Link
              href={`/${username}/${repoName}/pulls?state=${state}&page=${page - 1}`}
            >
              <Button variant="outline">Previous</Button>
            </Link>
          )}
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          {page < totalPages && (
            <Link
              href={`/${username}/${repoName}/pulls?state=${state}&page=${page + 1}`}
            >
              <Button variant="outline">Next</Button>
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

function PRRow({
  pullRequest,
  username,
  repoName,
}: {
  pullRequest: any;
  username: string;
  repoName: string;
}) {
  const getIcon = () => {
    if (pullRequest.draft) {
      return <GitPullRequest className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />;
    }
    switch (pullRequest.state) {
      case 'merged':
        return <GitMerge className="h-5 w-5 text-purple-600 mt-0.5 shrink-0" />;
      case 'closed':
        return <XCircle className="h-5 w-5 text-red-600 mt-0.5 shrink-0" />;
      default:
        return <GitPullRequest className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />;
    }
  };

  return (
    <div className="flex items-start gap-3 p-4 hover:bg-muted/30 transition-colors">
      {getIcon()}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href={`/${username}/${repoName}/pulls/${pullRequest.number}`}
            className="font-medium hover:text-primary hover:underline"
          >
            {pullRequest.title}
          </Link>
          {pullRequest.draft && (
            <Badge variant="secondary" className="text-xs">
              Draft
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
          <span>#{pullRequest.number}</span>
          <span>
            {pullRequest.state === 'merged' ? 'merged' : 'opened'}{' '}
            {formatRelativeTime(pullRequest.merged_at || pullRequest.created_at)} by{' '}
            {pullRequest.author?.username || 'unknown'}
          </span>
          <Badge variant="outline" className="text-xs">
            {pullRequest.head_ref} → {pullRequest.base_ref}
          </Badge>
        </div>
      </div>
      {pullRequest.comments_count > 0 && (
        <div className="flex items-center gap-1 text-sm text-muted-foreground shrink-0">
          <MessageSquare className="h-4 w-4" />
          {pullRequest.comments_count}
        </div>
      )}
    </div>
  );
}
