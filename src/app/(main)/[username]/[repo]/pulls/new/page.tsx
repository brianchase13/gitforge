import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import {
  GitBranch,
  GitPullRequest,
  ArrowRight,
  ChevronDown,
  FileText,
  Plus,
  Minus,
  Clock,
} from 'lucide-react';
import { getRepository } from '@/app/actions/repositories';
import { getTemplates } from '@/app/actions/templates';
import { getGitRepository } from '@/lib/git';
import { compareBranches } from '@/lib/git/diff';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
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
import { PRCreateForm } from '@/components/pull-requests/PRCreateForm';

interface NewPRPageProps {
  params: Promise<{
    username: string;
    repo: string;
  }>;
  searchParams: Promise<{
    base?: string;
    head?: string;
  }>;
}

export default async function NewPRPage({ params, searchParams }: NewPRPageProps) {
  const { username, repo: repoName } = await params;
  const { base: baseParam, head: headParam } = await searchParams;

  const repository = await getRepository(username, repoName);

  if (!repository || !repository.has_pull_requests) {
    notFound();
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?redirect=/${username}/${repoName}/pulls/new`);
  }

  // Get git data
  const gitRepo = await getGitRepository(repository.storage_path);
  let branches: string[] = [];
  let isEmpty = true;

  try {
    isEmpty = await gitRepo.isEmpty();
    if (!isEmpty) {
      branches = await gitRepo.listBranches();
    }
  } catch (error) {
    console.error('Error loading branches:', error);
  }

  if (isEmpty || branches.length < 2) {
    return (
      <div className="container py-6">
        <Card>
          <CardContent className="py-12 text-center">
            <GitPullRequest className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">Cannot create pull request</h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              {isEmpty
                ? 'This repository is empty. Push some code first to create pull requests.'
                : 'You need at least two branches to create a pull request.'}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Default to main/master as base and another branch as head
  const defaultBase = repository.default_branch || 'main';
  const base = baseParam || defaultBase;
  const head = headParam || branches.find((b) => b !== base) || branches[0];

  // Get diff if both branches are selected
  let diff = null;
  let commits: Array<{
    oid: string;
    message: string;
    author: { name: string; email: string; timestamp: number };
  }> = [];

  if (base !== head) {
    try {
      const baseResolved = await gitRepo.resolveRef(base);
      const headResolved = await gitRepo.resolveRef(head);

      if (baseResolved && headResolved) {
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
      }
    } catch (error) {
      console.error('Error comparing branches:', error);
    }
  }

  const hasChanges = diff && diff.files.length > 0;

  // Default title from branch name
  const defaultTitle = head
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (l) => l.toUpperCase());

  // Fetch PR templates for this repository
  const templates = await getTemplates(repository.id, 'pull_request');

  return (
    <div className="container py-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-4 flex items-center gap-2">
          <GitPullRequest className="h-6 w-6" />
          Open a pull request
        </h1>
        <p className="text-muted-foreground">
          Create a new pull request by comparing changes across two branches.
        </p>
      </div>

      {/* Branch selectors */}
      <Card className="mb-6">
        <CardContent className="py-4">
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
                  <div className="px-2 py-1.5 text-sm font-semibold">Choose base branch</div>
                  <div className="border-t my-1" />
                  {branches.map((branch) => (
                    <DropdownMenuItem key={branch} asChild>
                      <Link
                        href={`/${username}/${repoName}/pulls/new?base=${branch}&head=${head}`}
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
                  <div className="px-2 py-1.5 text-sm font-semibold">Choose compare branch</div>
                  <div className="border-t my-1" />
                  {branches.map((branch) => (
                    <DropdownMenuItem key={branch} asChild>
                      <Link
                        href={`/${username}/${repoName}/pulls/new?base=${base}&head=${branch}`}
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

            {hasChanges && (
              <div className="ml-auto flex items-center gap-4 text-sm text-muted-foreground">
                <span>
                  <strong>{commits.length}</strong> commit{commits.length !== 1 ? 's' : ''}
                </span>
                <span>
                  <strong>{diff!.totalFiles}</strong> file{diff!.totalFiles !== 1 ? 's' : ''} changed
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {base === head ? (
        <Card>
          <CardContent className="py-12 text-center">
            <GitPullRequest className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">Choose different branches</h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              You need to select different branches to create a pull request.
            </p>
          </CardContent>
        </Card>
      ) : !hasChanges ? (
        <Card>
          <CardContent className="py-12 text-center">
            <GitPullRequest className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">There isn't anything to compare</h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              {base} and {head} are identical. Try switching the base and compare branches.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* PR creation form */}
          <PRCreateForm
            repositoryId={repository.id}
            baseBranch={base}
            headBranch={head}
            defaultTitle={defaultTitle}
            username={username}
            repoName={repoName}
            templates={templates}
          />

          {/* Changes preview */}
          <Tabs defaultValue="commits" className="w-full mt-6">
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
                <Badge variant="secondary">{diff!.totalFiles}</Badge>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="commits">
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
            </TabsContent>

            <TabsContent value="files">
              <div className="space-y-4">
                {/* File list */}
                <Card>
                  <CardContent className="p-0 divide-y">
                    {diff!.files.map((file) => (
                      <div
                        key={file.path}
                        className="p-3 flex items-center justify-between hover:bg-muted/30"
                      >
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <span className="font-mono text-sm">{file.path}</span>
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
                {diff!.files.map((file) => (
                  <div key={file.path}>
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
