import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  GitBranch,
  GitCompare,
  ArrowRight,
  ChevronDown,
  FileText,
  Plus,
  Minus,
  Clock,
} from 'lucide-react';
import { getRepository } from '@/app/actions/repositories';
import { getGitRepository } from '@/lib/git';
import { compareBranches } from '@/lib/git/diff';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatRelativeTime } from '@/lib/utils';
import { DiffViewer } from '@/components/repository/DiffViewer';

interface ComparePageProps {
  params: Promise<{
    username: string;
    repo: string;
    refs: string[];
  }>;
}

function parseRefs(refs: string[]): { base: string; head: string } | null {
  // Handle format: compare/base...head or compare/base/head
  if (refs.length === 1) {
    // Format: base...head
    const parts = refs[0].split('...');
    if (parts.length === 2) {
      return { base: parts[0], head: parts[1] };
    }
    // Format: base..head (two dots)
    const parts2 = refs[0].split('..');
    if (parts2.length === 2) {
      return { base: parts2[0], head: parts2[1] };
    }
  } else if (refs.length === 2) {
    // Format: compare/base/head
    return { base: refs[0], head: refs[1] };
  }
  return null;
}

export default async function ComparePage({ params }: ComparePageProps) {
  const { username, repo: repoName, refs } = await params;

  const parsedRefs = parseRefs(refs);

  if (!parsedRefs) {
    notFound();
  }

  const { base, head } = parsedRefs;

  const repository = await getRepository(username, repoName);

  if (!repository) {
    notFound();
  }

  // Get git data
  const gitRepo = await getGitRepository(repository.storage_path);
  let diff = null;
  let commits: Array<{
    oid: string;
    message: string;
    author: { name: string; email: string; timestamp: number };
  }> = [];
  let branches: string[] = [];
  let baseResolved: string | null = null;
  let headResolved: string | null = null;

  try {
    branches = await gitRepo.listBranches();

    // Resolve refs
    baseResolved = await gitRepo.resolveRef(base);
    headResolved = await gitRepo.resolveRef(head);

    if (!baseResolved || !headResolved) {
      return (
        <div className="container py-6">
          <Card className="border-destructive">
            <CardContent className="py-8 text-center">
              <GitCompare className="h-12 w-12 mx-auto text-destructive mb-4" />
              <h2 className="text-lg font-semibold mb-2">Unable to compare</h2>
              <p className="text-muted-foreground">
                {!baseResolved && `Base ref "${base}" not found. `}
                {!headResolved && `Head ref "${head}" not found.`}
              </p>
            </CardContent>
          </Card>
        </div>
      );
    }

    // Get diff
    diff = await compareBranches(gitRepo, base, head);

    // Get commits between the branches
    const allCommits = await gitRepo.log(head, 100);
    const baseCommits = new Set((await gitRepo.log(base, 100)).map((c) => c.oid));
    commits = allCommits
      .filter((c) => !baseCommits.has(c.oid))
      .map((c) => ({
        oid: c.oid,
        message: c.message,
        author: c.author,
      }));
  } catch (error) {
    console.error('Error comparing branches:', error);
    return (
      <div className="container py-6">
        <Card className="border-destructive">
          <CardContent className="py-8 text-center">
            <GitCompare className="h-12 w-12 mx-auto text-destructive mb-4" />
            <h2 className="text-lg font-semibold mb-2">Error comparing branches</h2>
            <p className="text-muted-foreground">
              {error instanceof Error ? error.message : 'Unknown error occurred'}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const hasChanges = diff && diff.files.length > 0;

  return (
    <div className="container py-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-4 flex items-center gap-2">
          <GitCompare className="h-6 w-6" />
          Compare changes
        </h1>

        {/* Branch selectors */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">base:</span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2 font-normal">
                  <GitBranch className="h-4 w-4" />
                  <span className="font-semibold">{base}</span>
                  <ChevronDown className="h-4 w-4 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-72 max-h-80 overflow-auto">
                <div className="px-2 py-1.5 text-sm font-semibold">Choose a base ref</div>
                <div className="border-t my-1" />
                {branches.map((branch) => (
                  <DropdownMenuItem key={branch} asChild>
                    <Link
                      href={`/${username}/${repoName}/compare/${branch}...${head}`}
                      className="gap-2"
                    >
                      <GitBranch className="h-4 w-4" />
                      {branch}
                    </Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <ArrowRight className="h-4 w-4 text-muted-foreground" />

          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">compare:</span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2 font-normal">
                  <GitBranch className="h-4 w-4" />
                  <span className="font-semibold">{head}</span>
                  <ChevronDown className="h-4 w-4 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-72 max-h-80 overflow-auto">
                <div className="px-2 py-1.5 text-sm font-semibold">Choose a head ref</div>
                <div className="border-t my-1" />
                {branches.map((branch) => (
                  <DropdownMenuItem key={branch} asChild>
                    <Link
                      href={`/${username}/${repoName}/compare/${base}...${branch}`}
                      className="gap-2"
                    >
                      <GitBranch className="h-4 w-4" />
                      {branch}
                    </Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {!hasChanges ? (
        <Card>
          <CardContent className="py-12 text-center">
            <GitCompare className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">
              {base === head ? 'Same branch' : "There isn't anything to compare"}
            </h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              {base === head
                ? 'You need to select different branches to compare.'
                : `${base} and ${head} are identical. Try switching the base and head refs.`}
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Summary card */}
          <Card className="mb-6">
            <CardContent className="py-4">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-6 text-sm">
                  <span>
                    <strong>{commits.length}</strong> commit{commits.length !== 1 ? 's' : ''}
                  </span>
                  <span>
                    <strong>{diff.totalFiles}</strong> file{diff.totalFiles !== 1 ? 's' : ''} changed
                  </span>
                  <span className="text-green-600">
                    <Plus className="h-4 w-4 inline" />
                    {diff.totalAdditions} additions
                  </span>
                  <span className="text-red-600">
                    <Minus className="h-4 w-4 inline" />
                    {diff.totalDeletions} deletions
                  </span>
                </div>
                <Link href={`/${username}/${repoName}/pulls/new?base=${base}&head=${head}`}>
                  <Button>Create pull request</Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Tabs */}
          <Tabs defaultValue="commits" className="w-full">
            <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent mb-6">
              <TabsTrigger
                value="commits"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent gap-2"
              >
                <GitBranch className="h-4 w-4" />
                Commits
                <Badge variant="secondary">{commits.length}</Badge>
              </TabsTrigger>
              <TabsTrigger
                value="files"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent gap-2"
              >
                <FileText className="h-4 w-4" />
                Files changed
                <Badge variant="secondary">{diff.totalFiles}</Badge>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="commits">
              {commits.length > 0 ? (
                <Card>
                  <CardContent className="p-0 divide-y">
                    {commits.map((commit) => (
                      <div key={commit.oid} className="p-4 flex items-start gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-xs">
                            {commit.author.name.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <Link
                            href={`/${username}/${repoName}/commit/${commit.oid}`}
                            className="font-medium hover:text-primary hover:underline line-clamp-1"
                          >
                            {commit.message.split('\n')[0]}
                          </Link>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                            <span>{commit.author.name}</span>
                            <span>committed</span>
                            <Clock className="h-3.5 w-3.5" />
                            <span>
                              {formatRelativeTime(
                                new Date(commit.author.timestamp * 1000).toISOString()
                              )}
                            </span>
                          </div>
                        </div>
                        <Link
                          href={`/${username}/${repoName}/commit/${commit.oid}`}
                          className="font-mono text-sm text-muted-foreground hover:text-primary shrink-0"
                        >
                          {commit.oid.slice(0, 7)}
                        </Link>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="py-8 text-center">
                    <GitBranch className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No commits between these branches.</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="files">
              <div className="space-y-4">
                {/* File list */}
                <Card>
                  <CardContent className="p-0 divide-y">
                    {diff.files.map((file) => (
                      <div
                        key={file.path}
                        className="p-3 flex items-center justify-between hover:bg-muted/30"
                      >
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <a
                            href={`#diff-${file.path.replace(/[^a-z0-9]/gi, '-')}`}
                            className="font-mono text-sm hover:underline"
                          >
                            {file.path}
                          </a>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge
                            variant={
                              file.status === 'added'
                                ? 'default'
                                : file.status === 'deleted'
                                  ? 'destructive'
                                  : 'secondary'
                            }
                            className="text-xs"
                          >
                            {file.status}
                          </Badge>
                          <span className="text-xs text-green-600">+{file.additions}</span>
                          <span className="text-xs text-red-600">-{file.deletions}</span>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>

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
              </div>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
