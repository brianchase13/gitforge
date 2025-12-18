import Link from 'next/link';
import {
  GitBranch,
  Tag,
  Clock,
  Code,
  Copy,
  FileText,
  Folder,
  ChevronDown,
  Star,
  GitFork,
  Eye,
  History,
  BookOpen,
  ExternalLink,
} from 'lucide-react';
import { getRepository } from '@/app/actions/repositories';
import { getGitRepository } from '@/lib/git';
import { createClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatRelativeTime } from '@/lib/utils';
import { Markdown } from '@/components/Markdown';
import { ForkButton } from '@/components/repository/ForkButton';

interface RepositoryPageProps {
  params: Promise<{
    username: string;
    repo: string;
  }>;
}

export default async function RepositoryPage({ params }: RepositoryPageProps) {
  const { username, repo: repoName } = await params;
  const repository = await getRepository(username, repoName);

  if (!repository) {
    return null;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isOwner = user?.id === repository.owner_id;

  // Get git data
  let gitRepo;
  let isEmpty = true;
  let branches: string[] = [];
  let tags: string[] = [];
  let commits: any[] = [];
  let tree: any = null;
  let readmeContent: string | null = null;

  try {
    gitRepo = await getGitRepository(repository.storage_path);
    isEmpty = await gitRepo.isEmpty();

    if (!isEmpty) {
      branches = await gitRepo.listBranches();
      tags = await gitRepo.listTags();
      commits = await gitRepo.log(repository.default_branch, 10);
      tree = await gitRepo.readTree(repository.default_branch);

      // Try to read README
      if (tree) {
        const readmeEntry = tree.entries.find((e: any) =>
          e.path.toLowerCase() === 'readme.md' || e.path.toLowerCase() === 'readme'
        );
        if (readmeEntry) {
          const blob = await gitRepo.readBlob(repository.default_branch, readmeEntry.path);
          if (blob) {
            readmeContent = new TextDecoder().decode(blob.content);
          }
        }
      }
    }
  } catch (error) {
    console.error('Error loading git data:', error);
  }

  const cloneUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/git/${username}/${repoName}.git`;
  const latestCommit = commits[0];

  // Empty repository - show setup instructions
  if (isEmpty) {
    return (
      <div className="max-w-4xl mx-auto py-8 px-4">
        <Card className="border-dashed">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <BookOpen className="w-8 h-8 text-muted-foreground" />
            </div>
            <CardTitle className="text-xl">Quick setup — if you've done this kind of thing before</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Clone URL with HTTPS/SSH toggle */}
            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
              <Badge variant="secondary" className="shrink-0">HTTPS</Badge>
              <code className="flex-1 text-sm font-mono truncate">{cloneUrl}</code>
              <Button variant="ghost" size="icon" className="shrink-0">
                <Copy className="h-4 w-4" />
              </Button>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  or create a new repository on the command line
                </span>
              </div>
            </div>

            <div className="bg-zinc-950 text-zinc-100 rounded-lg p-4 font-mono text-sm overflow-x-auto">
              <div className="space-y-1">
                <p><span className="text-green-400">echo</span> <span className="text-amber-300">"# {repository.name}"</span> &gt;&gt; README.md</p>
                <p><span className="text-green-400">git</span> init</p>
                <p><span className="text-green-400">git</span> add README.md</p>
                <p><span className="text-green-400">git</span> commit -m <span className="text-amber-300">"first commit"</span></p>
                <p><span className="text-green-400">git</span> branch -M main</p>
                <p><span className="text-green-400">git</span> remote add origin <span className="text-cyan-300">{cloneUrl}</span></p>
                <p><span className="text-green-400">git</span> push -u origin main</p>
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  or push an existing repository
                </span>
              </div>
            </div>

            <div className="bg-zinc-950 text-zinc-100 rounded-lg p-4 font-mono text-sm overflow-x-auto">
              <div className="space-y-1">
                <p><span className="text-green-400">git</span> remote add origin <span className="text-cyan-300">{cloneUrl}</span></p>
                <p><span className="text-green-400">git</span> branch -M main</p>
                <p><span className="text-green-400">git</span> push -u origin main</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Repository with content
  return (
    <div className="max-w-7xl mx-auto py-6 px-4">
      {/* Repository header with actions */}
      <div className="flex items-center justify-end gap-2 mb-4">
        <ForkButton
          repositoryId={repository.id}
          isLoggedIn={!!user}
          isOwner={isOwner}
          isFork={repository.is_fork}
          forkCount={repository.forks_count || 0}
        />
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Main content */}
        <div className="flex-1 min-w-0 space-y-4">
          {/* Actions bar */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              {/* Branch selector */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2 font-normal">
                    <GitBranch className="h-4 w-4" />
                    <span className="font-semibold">{repository.default_branch}</span>
                    <ChevronDown className="h-4 w-4 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-72">
                  <div className="px-2 py-1.5 text-sm font-semibold">Switch branches/tags</div>
                  <div className="border-t my-1" />
                  {branches.map((branch) => (
                    <DropdownMenuItem key={branch} className="gap-2">
                      <GitBranch className="h-4 w-4" />
                      {branch}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <Link href={`/${username}/${repoName}/branches`}>
                <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-foreground">
                  <GitBranch className="h-4 w-4" />
                  <span className="font-semibold text-foreground">{branches.length}</span>
                  <span>branch{branches.length !== 1 ? 'es' : ''}</span>
                </Button>
              </Link>

              <Link href={`/${username}/${repoName}/tags`}>
                <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-foreground">
                  <Tag className="h-4 w-4" />
                  <span className="font-semibold text-foreground">{tags.length}</span>
                  <span>tag{tags.length !== 1 ? 's' : ''}</span>
                </Button>
              </Link>
            </div>

            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="default" size="sm" className="gap-2">
                    <Code className="h-4 w-4" />
                    Code
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-80">
                  <div className="p-3 space-y-3">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">HTTPS</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 bg-muted px-2 py-1 rounded text-xs font-mono truncate">
                        {cloneUrl}
                      </code>
                      <Button variant="ghost" size="icon" className="h-7 w-7">
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* File browser */}
          <Card className="overflow-hidden">
            {/* Latest commit header */}
            {latestCommit && (
              <div className="flex items-center justify-between gap-4 px-4 py-3 bg-muted/40 border-b">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-6 w-6 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 shrink-0" />
                  <Link
                    href={`/${username}/${repoName}/commit/${latestCommit.oid}`}
                    className="text-sm font-medium hover:text-primary truncate"
                  >
                    {latestCommit.message.split('\n')[0]}
                  </Link>
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground shrink-0">
                  <Link
                    href={`/${username}/${repoName}/commit/${latestCommit.oid}`}
                    className="font-mono hover:text-primary hover:underline"
                  >
                    {latestCommit.oid.slice(0, 7)}
                  </Link>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {formatRelativeTime(new Date(latestCommit.author.timestamp * 1000).toISOString())}
                  </span>
                  <Link
                    href={`/${username}/${repoName}/commits`}
                    className="flex items-center gap-1 hover:text-primary"
                  >
                    <History className="h-3.5 w-3.5" />
                    <span className="font-semibold">{commits.length}</span>
                    <span>commits</span>
                  </Link>
                </div>
              </div>
            )}

            {/* File tree */}
            <div className="divide-y">
              {tree?.entries
                .sort((a: any, b: any) => {
                  // Folders first, then files
                  if (a.type === 'tree' && b.type !== 'tree') return -1;
                  if (a.type !== 'tree' && b.type === 'tree') return 1;
                  return a.path.localeCompare(b.path);
                })
                .map((entry: any) => (
                  <FileRow
                    key={entry.oid}
                    type={entry.type === 'tree' ? 'folder' : 'file'}
                    name={entry.path}
                    href={
                      entry.type === 'tree'
                        ? `/${username}/${repoName}/tree/${repository.default_branch}/${entry.path}`
                        : `/${username}/${repoName}/blob/${repository.default_branch}/${entry.path}`
                    }
                    commit={latestCommit}
                  />
                ))}
            </div>
          </Card>

          {/* README */}
          {readmeContent && (
            <Card>
              <CardHeader className="flex-row items-center gap-2 py-3 px-4 border-b bg-muted/30">
                <BookOpen className="h-4 w-4" />
                <span className="text-sm font-semibold">README.md</span>
              </CardHeader>
              <CardContent className="p-6">
                <article className="prose prose-sm dark:prose-invert max-w-none prose-headings:font-semibold prose-h1:text-2xl prose-h1:border-b prose-h1:pb-2 prose-a:text-primary">
                  <Markdown>{readmeContent}</Markdown>
                </article>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <aside className="w-full lg:w-80 shrink-0 space-y-4">
          {/* About */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">About</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {repository.description ? (
                <p className="text-sm leading-relaxed">{repository.description}</p>
              ) : (
                <p className="text-sm text-muted-foreground italic">No description provided</p>
              )}

              <div className="flex flex-wrap gap-1.5">
                {repository.topics?.map((topic: string) => (
                  <Badge key={topic} variant="secondary" className="text-xs font-normal">
                    {topic}
                  </Badge>
                ))}
              </div>

              <div className="space-y-2 text-sm">
                {repository.homepage_url && (
                  <a
                    href={repository.homepage_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-primary hover:underline"
                  >
                    <ExternalLink className="h-4 w-4" />
                    {repository.homepage_url}
                  </a>
                )}
              </div>

              <div className="flex items-center gap-4 pt-2 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Star className="h-4 w-4" />
                  <span className="font-semibold text-foreground">{repository.stars_count}</span>
                  stars
                </span>
                <span className="flex items-center gap-1">
                  <GitFork className="h-4 w-4" />
                  <span className="font-semibold text-foreground">{repository.forks_count}</span>
                  forks
                </span>
                <span className="flex items-center gap-1">
                  <Eye className="h-4 w-4" />
                  <span className="font-semibold text-foreground">{repository.watchers_count || 0}</span>
                  watching
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Contributors */}
          {commits.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Contributors</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-1">
                  {Array.from(new Set(commits.map(c => c.author.email))).slice(0, 10).map((email, i) => (
                    <div
                      key={email}
                      className="h-8 w-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500"
                      title={commits.find(c => c.author.email === email)?.author.name}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </aside>
      </div>
    </div>
  );
}

function FileRow({
  type,
  name,
  href,
  commit,
}: {
  type: 'file' | 'folder';
  name: string;
  href: string;
  commit?: any;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/50 transition-colors group"
    >
      {type === 'folder' ? (
        <Folder className="h-4 w-4 text-blue-500 fill-blue-500/20" />
      ) : (
        <FileText className="h-4 w-4 text-muted-foreground" />
      )}
      <span className="text-sm group-hover:text-primary group-hover:underline truncate min-w-[120px] max-w-[200px]">
        {name}
      </span>
      {commit && (
        <>
          <span className="text-sm text-muted-foreground truncate flex-1 hidden md:block">
            {commit.message.split('\n')[0]}
          </span>
          <span className="text-sm text-muted-foreground shrink-0 hidden sm:block">
            {formatRelativeTime(new Date(commit.author.timestamp * 1000).toISOString())}
          </span>
        </>
      )}
    </Link>
  );
}

