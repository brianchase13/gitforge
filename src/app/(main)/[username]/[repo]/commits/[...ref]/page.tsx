import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  GitCommit,
  GitBranch,
  Copy,
  Code,
  User,
  Calendar,
  FileText,
  ChevronRight,
  History,
  Plus,
  Minus,
  Edit,
  Trash2,
} from 'lucide-react';
import { getRepository } from '@/app/actions/repositories';
import { getGitRepository } from '@/lib/git';
import { getFileHistoryAccurate, type FileHistoryEntry } from '@/lib/git/history';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { formatRelativeTime } from '@/lib/utils';

interface CommitsPageProps {
  params: Promise<{
    username: string;
    repo: string;
    ref: string[];
  }>;
  searchParams: Promise<{
    page?: string;
  }>;
}

export default async function CommitsPage({
  params,
  searchParams,
}: CommitsPageProps) {
  const { username, repo: repoName, ref: refSegments } = await params;
  const { page: pageParam } = await searchParams;

  const repository = await getRepository(username, repoName);

  if (!repository) {
    notFound();
  }

  const ref = refSegments?.[0] || repository.default_branch;
  const filePath = refSegments?.slice(1).join('/') || '';

  const gitRepo = await getGitRepository(repository.storage_path);

  // Check if repo has commits
  const isEmpty = await gitRepo.isEmpty();

  if (isEmpty) {
    return (
      <div className="container py-8">
        <Card>
          <CardContent className="py-12 text-center">
            <GitCommit className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">No commits yet</h2>
            <p className="text-muted-foreground">
              This repository doesn't have any commits. Push your first commit to get started.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Pagination
  const page = parseInt(pageParam || '1');
  const perPage = 30;
  const skip = (page - 1) * perPage;

  // Get commits - filter by file path if provided
  let commits: Array<{
    oid: string;
    message: string;
    author: { name: string; email: string; timestamp: number };
    changeType?: 'added' | 'modified' | 'deleted' | 'renamed';
  }> = [];
  let totalCommits = 0;
  let hasMore = false;

  if (filePath) {
    // Get file-specific history
    const history = await getFileHistoryAccurate(gitRepo, ref, filePath, perPage + skip + 1);
    const allEntries = history.entries;
    commits = allEntries.slice(skip, skip + perPage).map((entry) => ({
      oid: entry.commit.oid,
      message: entry.commit.message,
      author: entry.commit.author,
      changeType: entry.changeType,
    }));
    totalCommits = allEntries.length;
    hasMore = allEntries.length > skip + perPage;
  } else {
    // Get all commits for the branch
    const allCommits = await gitRepo.log(ref, perPage + skip + 1);
    commits = allCommits.slice(skip, skip + perPage);
    totalCommits = allCommits.length;
    hasMore = allCommits.length > skip + perPage;
  }

  // Group commits by date
  const groupedCommits = groupCommitsByDate(commits);

  // Build breadcrumbs for file path
  const pathParts = filePath ? filePath.split('/').filter(Boolean) : [];
  const breadcrumbs = pathParts.map((part, index) => ({
    name: part,
    path: pathParts.slice(0, index + 1).join('/'),
    isLast: index === pathParts.length - 1,
  }));
  const fileName = pathParts[pathParts.length - 1] || '';

  return (
    <div className="container py-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          {filePath ? (
            <>
              {/* Breadcrumbs for file history */}
              <div className="flex items-center gap-1 text-sm mb-2">
                <Link
                  href={`/${username}/${repoName}`}
                  className="text-primary hover:underline"
                >
                  {repoName}
                </Link>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                {breadcrumbs.map((crumb) => (
                  <span key={crumb.path} className="flex items-center gap-1">
                    {crumb.isLast ? (
                      <span className="font-medium">{crumb.name}</span>
                    ) : (
                      <>
                        <Link
                          href={`/${username}/${repoName}/tree/${ref}/${crumb.path}`}
                          className="text-primary hover:underline"
                        >
                          {crumb.name}
                        </Link>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </>
                    )}
                  </span>
                ))}
              </div>
              <h1 className="text-xl font-semibold flex items-center gap-2">
                <History className="h-5 w-5" />
                History: {fileName}
              </h1>
            </>
          ) : (
            <h1 className="text-xl font-semibold flex items-center gap-2">
              <GitCommit className="h-5 w-5" />
              Commits
            </h1>
          )}
        </div>

        <div className="flex items-center gap-3">
          <Badge variant="outline" className="gap-1">
            <GitBranch className="h-3 w-3" />
            {ref}
          </Badge>
          {filePath && (
            <>
              <Link href={`/${username}/${repoName}/blob/${ref}/${filePath}`}>
                <Button variant="outline" size="sm" className="gap-2">
                  <Code className="h-4 w-4" />
                  View file
                </Button>
              </Link>
              <Link href={`/${username}/${repoName}/blame/${ref}/${filePath}`}>
                <Button variant="outline" size="sm" className="gap-2">
                  <User className="h-4 w-4" />
                  Blame
                </Button>
              </Link>
            </>
          )}
          <span className="text-sm text-muted-foreground">
            {totalCommits} commit{totalCommits !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Commits list */}
      <div className="space-y-6">
        {Object.entries(groupedCommits).map(([date, dateCommits]) => (
          <div key={date}>
            <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Commits on {date}
            </h3>
            <Card>
              <CardContent className="p-0 divide-y">
                {dateCommits.map((commit) => (
                  <CommitRow
                    key={commit.oid}
                    commit={commit}
                    username={username}
                    repoName={repoName}
                    showChangeType={!!filePath}
                  />
                ))}
              </CardContent>
            </Card>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {(page > 1 || hasMore) && (
        <div className="flex items-center justify-center gap-4 mt-8">
          {page > 1 && (
            <Link
              href={`/${username}/${repoName}/commits/${ref}${filePath ? `/${filePath}` : ''}?page=${page - 1}`}
            >
              <Button variant="outline">Newer</Button>
            </Link>
          )}
          {hasMore && (
            <Link
              href={`/${username}/${repoName}/commits/${ref}${filePath ? `/${filePath}` : ''}?page=${page + 1}`}
            >
              <Button variant="outline">Older</Button>
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

function CommitRow({
  commit,
  username,
  repoName,
  showChangeType = false,
}: {
  commit: {
    oid: string;
    message: string;
    author: { name: string; email: string; timestamp: number };
    changeType?: 'added' | 'modified' | 'deleted' | 'renamed';
  };
  username: string;
  repoName: string;
  showChangeType?: boolean;
}) {
  const messageLines = commit.message.split('\n');
  const title = messageLines[0];
  const hasBody = messageLines.length > 1 && messageLines.slice(1).join('').trim().length > 0;

  const getChangeIcon = (type: string | undefined) => {
    switch (type) {
      case 'added':
        return <Plus className="h-3 w-3" />;
      case 'deleted':
        return <Trash2 className="h-3 w-3" />;
      case 'modified':
        return <Edit className="h-3 w-3" />;
      default:
        return <FileText className="h-3 w-3" />;
    }
  };

  const getChangeBadgeVariant = (type: string | undefined) => {
    switch (type) {
      case 'added':
        return 'default';
      case 'deleted':
        return 'destructive';
      case 'modified':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  return (
    <div className="flex items-start justify-between gap-4 p-4 hover:bg-muted/30 transition-colors">
      <div className="flex items-start gap-3 min-w-0">
        <Avatar className="h-8 w-8 mt-0.5">
          <AvatarFallback className="text-xs">
            {commit.author.name.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Link
              href={`/${username}/${repoName}/commit/${commit.oid}`}
              className="font-medium hover:text-primary hover:underline line-clamp-1"
            >
              {title}
            </Link>
            {showChangeType && commit.changeType && (
              <Badge
                variant={getChangeBadgeVariant(commit.changeType) as any}
                className="gap-1 text-xs capitalize"
              >
                {getChangeIcon(commit.changeType)}
                {commit.changeType}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
            <span className="flex items-center gap-1">
              <User className="h-3 w-3" />
              {commit.author.name}
            </span>
            <span>committed {formatRelativeTime(new Date(commit.author.timestamp * 1000).toISOString())}</span>
          </div>
          {hasBody && (
            <Button variant="ghost" size="sm" className="h-6 px-2 mt-1 text-xs">
              ...
            </Button>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Link
          href={`/${username}/${repoName}/commit/${commit.oid}`}
          className="font-mono text-sm text-muted-foreground hover:text-primary hover:underline"
        >
          {commit.oid.slice(0, 7)}
        </Link>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Copy className="h-3 w-3" />
        </Button>
        <Link href={`/${username}/${repoName}/tree/${commit.oid}`}>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Code className="h-3 w-3" />
          </Button>
        </Link>
      </div>
    </div>
  );
}

function groupCommitsByDate(
  commits: Array<{
    oid: string;
    message: string;
    author: { name: string; email: string; timestamp: number };
    changeType?: 'added' | 'modified' | 'deleted' | 'renamed';
  }>
): Record<string, typeof commits> {
  const groups: Record<string, typeof commits> = {};

  for (const commit of commits) {
    const date = new Date(commit.author.timestamp * 1000);
    const dateKey = date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    groups[dateKey].push(commit);
  }

  return groups;
}
