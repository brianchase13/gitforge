import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  GitCommit,
  User,
  Calendar,
  Copy,
  ChevronRight,
  FileText,
  Plus,
  Minus,
  Code,
} from 'lucide-react';
import { getRepository } from '@/app/actions/repositories';
import { getGitRepository } from '@/lib/git';
import { getCommitDiff, type FileDiff } from '@/lib/git/diff';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { formatRelativeTime } from '@/lib/utils';
import { DiffViewer } from '@/components/repository/DiffViewer';

interface CommitPageProps {
  params: Promise<{
    username: string;
    repo: string;
    sha: string;
  }>;
}

export default async function CommitPage({ params }: CommitPageProps) {
  const { username, repo: repoName, sha } = await params;

  const repository = await getRepository(username, repoName);

  if (!repository) {
    notFound();
  }

  const gitRepo = await getGitRepository(repository.storage_path);

  // Get the commit
  const commit = await gitRepo.readCommit(sha);

  if (!commit) {
    notFound();
  }

  const messageLines = commit.message.split('\n');
  const title = messageLines[0];
  const body = messageLines.slice(1).join('\n').trim();

  // Get parent commit for diff comparison
  const parentOid = commit.parent?.[0];

  // Get the actual diff
  let diff = null;
  try {
    diff = await getCommitDiff(gitRepo, sha);
  } catch (error) {
    console.error('Error computing diff:', error);
  }

  return (
    <div className="container py-6">
      {/* Commit header */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="text-xl">{title}</CardTitle>
              {body && (
                <pre className="mt-4 text-sm text-muted-foreground whitespace-pre-wrap font-sans">
                  {body}
                </pre>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Link href={`/${username}/${repoName}/tree/${sha}`}>
                <Button variant="outline" size="sm" className="gap-2">
                  <Code className="h-4 w-4" />
                  Browse files
                </Button>
              </Link>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            {/* Author info */}
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarFallback>
                  {commit.author.name.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{commit.author.name}</span>
                  <span className="text-muted-foreground">committed</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  {formatRelativeTime(new Date(commit.author.timestamp * 1000).toISOString())}
                </div>
              </div>
            </div>

            {/* Commit SHA */}
            <div className="sm:ml-auto flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Commit</span>
              <div className="flex items-center gap-1 bg-muted px-3 py-1 rounded-md">
                <code className="text-sm font-mono">{sha}</code>
                <Button variant="ghost" size="icon" className="h-6 w-6">
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>

          {/* Parent commits */}
          {commit.parent && commit.parent.length > 0 && (
            <div className="mt-4 pt-4 border-t">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">
                  {commit.parent.length} parent{commit.parent.length > 1 ? 's' : ''}
                </span>
                {commit.parent.map((parentSha) => (
                  <Link
                    key={parentSha}
                    href={`/${username}/${repoName}/commit/${parentSha}`}
                    className="font-mono text-primary hover:underline"
                  >
                    {parentSha.slice(0, 7)}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Diff section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <GitCommit className="h-4 w-4" />
              {diff ? `${diff.totalFiles} changed file${diff.totalFiles !== 1 ? 's' : ''}` : 'Changes'}
            </CardTitle>
            {diff && (
              <div className="flex items-center gap-4 text-sm">
                <span className="flex items-center gap-1 text-green-600">
                  <Plus className="h-4 w-4" />
                  <span>{diff.totalAdditions} addition{diff.totalAdditions !== 1 ? 's' : ''}</span>
                </span>
                <span className="flex items-center gap-1 text-red-600">
                  <Minus className="h-4 w-4" />
                  <span>{diff.totalDeletions} deletion{diff.totalDeletions !== 1 ? 's' : ''}</span>
                </span>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {diff && diff.files.length > 0 ? (
            <>
              {/* File list summary */}
              <div className="border rounded-md divide-y">
                {diff.files.map((file) => (
                  <div key={file.path} className="p-3 flex items-center justify-between hover:bg-muted/30">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <a href={`#diff-${file.path.replace(/[^a-z0-9]/gi, '-')}`} className="font-mono text-sm hover:underline">
                        {file.path}
                      </a>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant={
                        file.status === 'added' ? 'default' :
                        file.status === 'deleted' ? 'destructive' :
                        'secondary'
                      } className="text-xs">
                        {file.status}
                      </Badge>
                      <span className="text-xs text-green-600">+{file.additions}</span>
                      <span className="text-xs text-red-600">-{file.deletions}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Individual file diffs */}
              {diff.files.map((file) => (
                <div key={file.path} id={`diff-${file.path.replace(/[^a-z0-9]/gi, '-')}`}>
                  <DiffViewer
                    diff={file.patch}
                    fileName={file.path}
                    additions={file.additions}
                    deletions={file.deletions}
                  />
                </div>
              ))}
            </>
          ) : !parentOid ? (
            <div className="text-center py-8 text-muted-foreground">
              <GitCommit className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>This is the initial commit.</p>
              {diff && diff.files.length > 0 && (
                <p className="mt-2">Files were added but no parent exists to compare against.</p>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No changes found in this commit.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
