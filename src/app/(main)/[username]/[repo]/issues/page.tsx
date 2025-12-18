import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  CircleDot,
  CheckCircle2,
  MessageSquare,
  Tag,
  Search,
  Plus,
} from 'lucide-react';
import { getRepository } from '@/app/actions/repositories';
import { getIssues, getLabels } from '@/app/actions/issues';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatRelativeTime } from '@/lib/utils';

interface IssuesPageProps {
  params: Promise<{
    username: string;
    repo: string;
  }>;
  searchParams: Promise<{
    state?: string;
    label?: string;
    page?: string;
  }>;
}

export default async function IssuesPage({
  params,
  searchParams,
}: IssuesPageProps) {
  const { username, repo: repoName } = await params;
  const { state = 'open', label, page: pageParam } = await searchParams;

  const repository = await getRepository(username, repoName);

  if (!repository || !repository.has_issues) {
    notFound();
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const page = parseInt(pageParam || '1');
  const perPage = 25;

  const { issues, total } = await getIssues(username, repoName, {
    state: state as 'open' | 'closed' | 'all',
    label,
    page,
    perPage,
  });

  const labels = await getLabels(repository.id);

  // Get counts
  const { issues: openIssues } = await getIssues(username, repoName, { state: 'open' });
  const { issues: closedIssues } = await getIssues(username, repoName, { state: 'closed' });

  const totalPages = Math.ceil(total / perPage);

  return (
    <div className="container py-6">
      {/* Filters bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-2">
          <Link href={`/${username}/${repoName}/issues?state=open`}>
            <Button
              variant={state === 'open' ? 'secondary' : 'ghost'}
              size="sm"
              className="gap-2"
            >
              <CircleDot className="h-4 w-4" />
              {openIssues.length} Open
            </Button>
          </Link>
          <Link href={`/${username}/${repoName}/issues?state=closed`}>
            <Button
              variant={state === 'closed' ? 'secondary' : 'ghost'}
              size="sm"
              className="gap-2"
            >
              <CheckCircle2 className="h-4 w-4" />
              {closedIssues.length} Closed
            </Button>
          </Link>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search issues..."
              className="pl-10 w-64"
            />
          </div>
          {user && (
            <Link href={`/${username}/${repoName}/issues/new`}>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                New issue
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Labels filter */}
      {labels.length > 0 && (
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <Tag className="h-4 w-4 text-muted-foreground" />
          <Link href={`/${username}/${repoName}/issues?state=${state}`}>
            <Badge
              variant={!label ? 'secondary' : 'outline'}
              className="cursor-pointer"
            >
              All labels
            </Badge>
          </Link>
          {labels.slice(0, 10).map((l) => (
            <Link
              key={l.id}
              href={`/${username}/${repoName}/issues?state=${state}&label=${l.name}`}
            >
              <Badge
                variant={label === l.name ? 'secondary' : 'outline'}
                className="cursor-pointer"
                style={{
                  backgroundColor: label === l.name ? `#${l.color}30` : undefined,
                  borderColor: `#${l.color}`,
                  color: label === l.name ? `#${l.color}` : undefined,
                }}
              >
                {l.name}
              </Badge>
            </Link>
          ))}
        </div>
      )}

      {/* Issues list */}
      {issues.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <CircleDot className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">
              {state === 'open'
                ? 'No open issues'
                : state === 'closed'
                ? 'No closed issues'
                : 'No issues'}
            </h3>
            <p className="text-muted-foreground mb-4">
              {state === 'open'
                ? 'Great job! All issues have been resolved.'
                : 'There are no closed issues yet.'}
            </p>
            {user && (
              <Link href={`/${username}/${repoName}/issues/new`}>
                <Button>Create an issue</Button>
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0 divide-y">
            {issues.map((issue) => (
              <IssueRow
                key={issue.id}
                issue={issue}
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
              href={`/${username}/${repoName}/issues?state=${state}${label ? `&label=${label}` : ''}&page=${page - 1}`}
            >
              <Button variant="outline">Previous</Button>
            </Link>
          )}
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          {page < totalPages && (
            <Link
              href={`/${username}/${repoName}/issues?state=${state}${label ? `&label=${label}` : ''}&page=${page + 1}`}
            >
              <Button variant="outline">Next</Button>
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

function IssueRow({
  issue,
  username,
  repoName,
}: {
  issue: any;
  username: string;
  repoName: string;
}) {
  return (
    <div className="flex items-start gap-3 p-4 hover:bg-muted/30 transition-colors">
      {issue.state === 'open' ? (
        <CircleDot className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
      ) : (
        <CheckCircle2 className="h-5 w-5 text-purple-600 mt-0.5 shrink-0" />
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href={`/${username}/${repoName}/issues/${issue.number}`}
            className="font-medium hover:text-primary hover:underline"
          >
            {issue.title}
          </Link>
          {issue.labels?.map((il: any) => (
            <Badge
              key={il.label.id}
              variant="outline"
              className="text-xs"
              style={{
                backgroundColor: `#${il.label.color}20`,
                borderColor: `#${il.label.color}`,
                color: `#${il.label.color}`,
              }}
            >
              {il.label.name}
            </Badge>
          ))}
        </div>
        <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
          <span>#{issue.number}</span>
          <span>
            opened {formatRelativeTime(issue.created_at)} by{' '}
            {issue.author?.username || 'unknown'}
          </span>
        </div>
      </div>
      {issue.comments_count > 0 && (
        <div className="flex items-center gap-1 text-sm text-muted-foreground shrink-0">
          <MessageSquare className="h-4 w-4" />
          {issue.comments_count}
        </div>
      )}
    </div>
  );
}
