import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  Folder,
  FileText,
  ChevronRight,
  GitBranch,
  Clock,
  History,
} from 'lucide-react';
import { getRepository } from '@/app/actions/repositories';
import { getGitRepository } from '@/lib/git';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatRelativeTime, getLanguageFromExtension } from '@/lib/utils';

interface TreePageProps {
  params: Promise<{
    username: string;
    repo: string;
    path: string[];
  }>;
}

export default async function TreePage({ params }: TreePageProps) {
  const { username, repo: repoName, path: pathSegments } = await params;

  const repository = await getRepository(username, repoName);

  if (!repository) {
    notFound();
  }

  // First segment is the ref (branch/tag/commit), rest is the path
  const ref = pathSegments[0] || repository.default_branch;
  const filePath = pathSegments.slice(1).join('/');

  const gitRepo = await getGitRepository(repository.storage_path);

  // Check if repo has commits
  const isEmpty = await gitRepo.isEmpty();

  if (isEmpty) {
    return (
      <div className="container py-8">
        <Card>
          <CardContent className="py-12 text-center">
            <Folder className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">This repository is empty</h2>
            <p className="text-muted-foreground">
              Push some code to get started, or initialize with a README.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Get tree contents
  const tree = await gitRepo.readTree(ref, filePath);

  if (!tree) {
    notFound();
  }

  // Get latest commit for the path
  const commits = await gitRepo.log(ref, 1);
  const latestCommit = commits[0];

  // Sort entries: folders first, then files, both alphabetically
  const sortedEntries = [...tree.entries].sort((a, b) => {
    if (a.type === 'tree' && b.type !== 'tree') return -1;
    if (a.type !== 'tree' && b.type === 'tree') return 1;
    return a.path.localeCompare(b.path);
  });

  // Build breadcrumb path segments
  const pathParts = filePath ? filePath.split('/') : [];
  const breadcrumbs = pathParts.map((part, index) => ({
    name: part,
    href: `/${username}/${repoName}/tree/${ref}/${pathParts.slice(0, index + 1).join('/')}`,
  }));

  return (
    <div className="container py-6">
      {/* Branch selector and path */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <Button variant="outline" size="sm" className="gap-2">
          <GitBranch className="h-4 w-4" />
          {ref}
        </Button>

        {/* Breadcrumb */}
        <div className="flex items-center gap-1 text-sm">
          <Link
            href={`/${username}/${repoName}/tree/${ref}`}
            className="text-primary hover:underline font-medium"
          >
            {repoName}
          </Link>
          {breadcrumbs.map((crumb, index) => (
            <span key={crumb.href} className="flex items-center gap-1">
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
              <Link
                href={crumb.href}
                className={
                  index === breadcrumbs.length - 1
                    ? 'font-medium'
                    : 'text-primary hover:underline'
                }
              >
                {crumb.name}
              </Link>
            </span>
          ))}
        </div>

        <div className="ml-auto">
          <Link href={`/${username}/${repoName}/commits/${ref}`}>
            <Button variant="ghost" size="sm" className="gap-2">
              <History className="h-4 w-4" />
              History
            </Button>
          </Link>
        </div>
      </div>

      {/* File tree */}
      <Card>
        <CardContent className="p-0">
          {/* Latest commit */}
          {latestCommit && (
            <div className="flex items-center justify-between gap-4 p-3 border-b bg-muted/30">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium">
                  {latestCommit.author.name.slice(0, 1).toUpperCase()}
                </div>
                <span className="text-sm truncate">
                  {latestCommit.message.split('\n')[0]}
                </span>
              </div>
              <div className="flex items-center gap-3 text-sm text-muted-foreground shrink-0">
                <Link
                  href={`/${username}/${repoName}/commit/${latestCommit.oid}`}
                  className="font-mono hover:text-primary hover:underline"
                >
                  {latestCommit.oid.slice(0, 7)}
                </Link>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatRelativeTime(new Date(latestCommit.author.timestamp * 1000).toISOString())}
                </span>
              </div>
            </div>
          )}

          {/* File list */}
          <div className="divide-y">
            {/* Parent directory link */}
            {filePath && (
              <Link
                href={
                  pathParts.length > 1
                    ? `/${username}/${repoName}/tree/${ref}/${pathParts.slice(0, -1).join('/')}`
                    : `/${username}/${repoName}/tree/${ref}`
                }
                className="flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors"
              >
                <Folder className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-medium">..</span>
              </Link>
            )}

            {sortedEntries.map((entry) => {
              const isDir = entry.type === 'tree';
              const entryPath = filePath ? `${filePath}/${entry.path}` : entry.path;
              const href = isDir
                ? `/${username}/${repoName}/tree/${ref}/${entryPath}`
                : `/${username}/${repoName}/blob/${ref}/${entryPath}`;

              return (
                <Link
                  key={entry.oid}
                  href={href}
                  className="flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors"
                >
                  {isDir ? (
                    <Folder className="h-4 w-4 text-blue-500" />
                  ) : (
                    <FileText className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span className="text-sm font-medium truncate flex-1">
                    {entry.path}
                  </span>
                  {!isDir && (
                    <Badge variant="secondary" className="text-xs">
                      {getLanguageFromExtension(entry.path)}
                    </Badge>
                  )}
                </Link>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
