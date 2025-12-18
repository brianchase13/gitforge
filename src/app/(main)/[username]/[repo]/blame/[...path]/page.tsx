import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  FileText,
  GitCommit,
  User,
  Calendar,
  ChevronRight,
  Copy,
  History,
  Code,
} from 'lucide-react';
import { getRepository } from '@/app/actions/repositories';
import { getGitRepository } from '@/lib/git';
import { getFileBlame, type BlameLine } from '@/lib/git/blame';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { formatRelativeTime } from '@/lib/utils';

interface BlamePageProps {
  params: Promise<{
    username: string;
    repo: string;
    path: string[];
  }>;
}

export default async function BlamePage({ params }: BlamePageProps) {
  const { username, repo: repoName, path: pathSegments } = await params;
  const filePath = pathSegments.join('/');

  // Extract ref from first segment or default to 'main'
  const ref = pathSegments[0] || 'main';
  const actualPath = pathSegments.slice(1).join('/');

  const repository = await getRepository(username, repoName);

  if (!repository) {
    notFound();
  }

  const gitRepo = await getGitRepository(repository.storage_path);

  let blameResult;
  try {
    blameResult = await getFileBlame(gitRepo, ref, actualPath);
  } catch (error) {
    console.error('Error getting blame:', error);
    notFound();
  }

  // Build breadcrumbs
  const pathParts = actualPath.split('/').filter(Boolean);
  const breadcrumbs = pathParts.map((part, index) => ({
    name: part,
    path: pathParts.slice(0, index + 1).join('/'),
    isLast: index === pathParts.length - 1,
  }));

  // Get file extension for language detection
  const fileName = pathParts[pathParts.length - 1] || '';
  const extension = fileName.split('.').pop()?.toLowerCase() || '';

  return (
    <div className="container py-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          {/* Breadcrumbs */}
          <div className="flex items-center gap-1 text-sm mb-2">
            <Link
              href={`/${username}/${repoName}`}
              className="text-primary hover:underline"
            >
              {repoName}
            </Link>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
            {breadcrumbs.map((crumb, index) => (
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
            Blame: {fileName}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1">
            <GitCommit className="h-3 w-3" />
            {ref}
          </Badge>
          <Link href={`/${username}/${repoName}/blob/${ref}/${actualPath}`}>
            <Button variant="outline" size="sm" className="gap-2">
              <Code className="h-4 w-4" />
              View file
            </Button>
          </Link>
          <Link href={`/${username}/${repoName}/commits/${ref}/${actualPath}`}>
            <Button variant="outline" size="sm" className="gap-2">
              <History className="h-4 w-4" />
              History
            </Button>
          </Link>
        </div>
      </div>

      {/* Blame view */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <tbody>
                {blameResult.lines.map((line) => (
                  <BlameLineRow
                    key={line.lineNumber}
                    line={line}
                    username={username}
                    repoName={repoName}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function BlameLineRow({
  line,
  username,
  repoName,
}: {
  line: BlameLine;
  username: string;
  repoName: string;
}) {
  return (
    <tr className={`hover:bg-muted/30 ${line.isFirstLineOfCommit ? 'border-t' : ''}`}>
      {/* Commit info column - only show for first line of each commit group */}
      <td
        className={`px-3 py-1 text-xs text-muted-foreground whitespace-nowrap align-top ${
          line.isFirstLineOfCommit ? 'pt-2' : ''
        }`}
        style={{ width: '280px', minWidth: '280px' }}
      >
        {line.isFirstLineOfCommit && (
          <div className="flex items-start gap-2">
            <Avatar className="h-5 w-5 shrink-0">
              <AvatarFallback className="text-[10px]">
                {line.commit.author.name.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="overflow-hidden">
              <Link
                href={`/${username}/${repoName}/commit/${line.commit.oid}`}
                className="text-primary hover:underline font-mono text-xs"
                title={line.commit.oid}
              >
                {line.commit.shortOid}
              </Link>
              <div className="truncate text-muted-foreground" title={line.commit.message}>
                {line.commit.message}
              </div>
              <div className="flex items-center gap-1 text-muted-foreground text-xs">
                <span>{line.commit.author.name}</span>
                <span>•</span>
                <span>
                  {formatRelativeTime(new Date(line.commit.author.timestamp * 1000).toISOString())}
                </span>
              </div>
            </div>
          </div>
        )}
      </td>

      {/* Line number */}
      <td className="px-2 py-0.5 text-right text-muted-foreground font-mono text-xs select-none bg-muted/30 border-r">
        {line.lineNumber}
      </td>

      {/* Code content */}
      <td className="px-4 py-0.5 font-mono text-xs whitespace-pre overflow-x-auto">
        {line.content || '\u00A0'}
      </td>
    </tr>
  );
}
