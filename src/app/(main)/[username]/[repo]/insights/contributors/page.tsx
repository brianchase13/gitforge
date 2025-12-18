import { notFound } from 'next/navigation';
import { Users, GitCommit, Calendar } from 'lucide-react';
import { getRepository } from '@/app/actions/repositories';
import { getContributorStats, getCommitSummary } from '@/lib/git/insights';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { formatRelativeTime } from '@/lib/utils';

interface ContributorsPageProps {
  params: Promise<{
    username: string;
    repo: string;
  }>;
}

export default async function ContributorsPage({ params }: ContributorsPageProps) {
  const { username, repo: repoName } = await params;

  const repository = await getRepository(username, repoName);

  if (!repository) {
    notFound();
  }

  let contributors: Awaited<ReturnType<typeof getContributorStats>> = [];
  let summary: Awaited<ReturnType<typeof getCommitSummary>> | null = null;

  try {
    [contributors, summary] = await Promise.all([
      getContributorStats(repository.storage_path, repository.default_branch),
      getCommitSummary(repository.storage_path, repository.default_branch),
    ]);
  } catch (error) {
    console.error('Error fetching contributor stats:', error);
  }

  const totalCommits = contributors.reduce((sum, c) => sum + c.commits, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-2">Contributors</h1>
        <p className="text-muted-foreground">
          {contributors.length} contributors with commits to {repository.default_branch}
        </p>
      </div>

      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{summary.totalCommits}</div>
              <div className="text-sm text-muted-foreground">Total commits</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{summary.totalContributors}</div>
              <div className="text-sm text-muted-foreground">Contributors</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{summary.commitsThisWeek}</div>
              <div className="text-sm text-muted-foreground">This week</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{summary.commitsThisMonth}</div>
              <div className="text-sm text-muted-foreground">This month</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Contributors list */}
      {contributors.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No contributors yet</h3>
            <p className="text-muted-foreground">
              Push commits to see contributor statistics.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              All contributors
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {contributors.map((contributor, idx) => {
                const percentage = totalCommits > 0
                  ? Math.round((contributor.commits / totalCommits) * 100)
                  : 0;

                return (
                  <div
                    key={contributor.email}
                    className="flex items-center gap-4 p-4 hover:bg-muted/30"
                  >
                    <div className="text-muted-foreground w-6 text-right font-mono text-sm">
                      #{idx + 1}
                    </div>
                    <Avatar className="h-10 w-10">
                      <AvatarFallback>
                        {contributor.name[0]?.toUpperCase() || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">
                          {contributor.name}
                        </span>
                        <Badge variant="secondary" className="shrink-0">
                          {contributor.commits} commits
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground truncate">
                        {contributor.email}
                      </div>
                    </div>
                    <div className="hidden md:block text-right">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span>
                          Last commit {formatRelativeTime(new Date(contributor.lastCommit * 1000))}
                        </span>
                      </div>
                    </div>
                    <div className="w-20 text-right">
                      <div className="text-sm font-medium">{percentage}%</div>
                      <div className="w-full bg-muted rounded-full h-1.5 mt-1">
                        <div
                          className="bg-primary h-1.5 rounded-full"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
