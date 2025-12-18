import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  GitPullRequest,
  GitMerge,
  XCircle,
  GitBranch,
  MessageSquare,
  CheckCircle2,
  AlertCircle,
  FileText,
  Plus,
  Minus,
} from 'lucide-react';
import { getRepository } from '@/app/actions/repositories';
import { getPullRequest, getPRComments } from '@/app/actions/pull-requests';
import { getReactions, getReactionsForMany } from '@/app/actions/reactions';
import { createClient } from '@/lib/supabase/server';
import { getGitRepository } from '@/lib/git';
import { compareBranches } from '@/lib/git/diff';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { formatRelativeTime } from '@/lib/utils';
import { PRCommentForm } from '@/components/pull-requests/PRCommentForm';
import { PRMergeButton } from '@/components/pull-requests/PRMergeButton';
import { PRPublishButton } from '@/components/pull-requests/PRPublishButton';
import { DiffViewer } from '@/components/repository/DiffViewer';
import { Markdown } from '@/components/Markdown';
import { Reactions } from '@/components/reactions';

interface PRPageProps {
  params: Promise<{
    username: string;
    repo: string;
    number: string;
  }>;
}

export default async function PRPage({ params }: PRPageProps) {
  const { username, repo: repoName, number: numberStr } = await params;
  const number = parseInt(numberStr);

  if (isNaN(number)) {
    notFound();
  }

  const repository = await getRepository(username, repoName);

  if (!repository) {
    notFound();
  }

  const pullRequest = await getPullRequest(username, repoName, number);

  if (!pullRequest) {
    notFound();
  }

  const comments = await getPRComments(pullRequest.id);

  // Fetch reactions for the PR and all comments
  const prReactions = await getReactions('pull_request', pullRequest.id);
  const commentIds = comments.map((c: any) => c.id);
  const commentReactionsMap = commentIds.length > 0
    ? await getReactionsForMany('comment', commentIds)
    : new Map();

  // Get diff for "Files changed" tab
  const gitRepo = await getGitRepository(repository.storage_path);
  let diff = null;
  let commits: Array<{ oid: string; message: string; author: { name: string; timestamp: number } }> = [];

  try {
    diff = await compareBranches(gitRepo, pullRequest.base_ref, pullRequest.head_ref);

    // Get commits between the branches
    const allCommits = await gitRepo.log(pullRequest.head_ref, 100);
    const baseCommits = new Set((await gitRepo.log(pullRequest.base_ref, 100)).map(c => c.oid));
    commits = allCommits.filter(c => !baseCommits.has(c.oid)).map(c => ({
      oid: c.oid,
      message: c.message,
      author: c.author,
    }));
  } catch (error) {
    console.error('Error getting PR diff:', error);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isAuthor = user?.id === pullRequest.author_id;
  const isOwner = user?.id === repository.owner_id;
  const canMerge = isOwner && pullRequest.state === 'open' && pullRequest.mergeable && !pullRequest.draft;
  const canPublishDraft = (isAuthor || isOwner) && pullRequest.draft && pullRequest.state === 'open';

  const getStateIcon = () => {
    if (pullRequest.draft && pullRequest.state === 'open') {
      return <GitPullRequest className="h-4 w-4" />;
    }
    switch (pullRequest.state) {
      case 'merged':
        return <GitMerge className="h-4 w-4" />;
      case 'closed':
        return <XCircle className="h-4 w-4" />;
      default:
        return <GitPullRequest className="h-4 w-4" />;
    }
  };

  const getStateColor = () => {
    if (pullRequest.draft && pullRequest.state === 'open') {
      return 'bg-muted-foreground hover:bg-muted-foreground/80';
    }
    switch (pullRequest.state) {
      case 'merged':
        return 'bg-purple-600 hover:bg-purple-700';
      case 'closed':
        return 'bg-red-600 hover:bg-red-700';
      default:
        return 'bg-green-600 hover:bg-green-700';
    }
  };

  const getStateLabel = () => {
    if (pullRequest.draft && pullRequest.state === 'open') {
      return 'Draft';
    }
    return pullRequest.state;
  };

  return (
    <div className="container py-6">
      {/* PR header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">
          {pullRequest.title}
          <span className="text-muted-foreground font-normal ml-2">
            #{pullRequest.number}
          </span>
        </h1>
        <div className="flex items-center gap-3 flex-wrap">
          <Badge variant="default" className={getStateColor()}>
            {getStateIcon()}
            <span className="ml-1 capitalize">{getStateLabel()}</span>
          </Badge>
          <span className="text-sm text-muted-foreground">
            <Link
              href={`/${(pullRequest as any).author?.username}`}
              className="font-medium hover:text-primary hover:underline"
            >
              {(pullRequest as any).author?.username}
            </Link>
            {' wants to merge '}
            <Badge variant="outline" className="font-mono mx-1">
              {pullRequest.head_ref}
            </Badge>
            {' into '}
            <Badge variant="outline" className="font-mono mx-1">
              {pullRequest.base_ref}
            </Badge>
          </span>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="conversation" className="w-full">
        <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent mb-6">
          <TabsTrigger
            value="conversation"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent gap-2"
          >
            <MessageSquare className="h-4 w-4" />
            Conversation
            <Badge variant="secondary">{comments.length}</Badge>
          </TabsTrigger>
          <TabsTrigger
            value="commits"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent gap-2"
          >
            <GitBranch className="h-4 w-4" />
            Commits
          </TabsTrigger>
          <TabsTrigger
            value="files"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent gap-2"
          >
            Files changed
          </TabsTrigger>
        </TabsList>

        <TabsContent value="conversation">
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Main content */}
            <div className="flex-1 min-w-0 space-y-4">
              {/* PR body */}
              <Card>
                <CardHeader className="flex-row items-start justify-between gap-4 pb-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={(pullRequest as any).author?.avatar_url} />
                      <AvatarFallback>
                        {((pullRequest as any).author?.username || 'U').slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <Link
                        href={`/${(pullRequest as any).author?.username}`}
                        className="font-medium hover:text-primary hover:underline"
                      >
                        {(pullRequest as any).author?.username}
                      </Link>
                      <span className="text-sm text-muted-foreground ml-2">
                        commented {formatRelativeTime(pullRequest.created_at)}
                      </span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {pullRequest.body ? (
                    <Markdown>{pullRequest.body}</Markdown>
                  ) : (
                    <p className="text-muted-foreground italic">No description provided.</p>
                  )}
                  <Separator className="my-4" />
                  <Reactions
                    reactableType="pull_request"
                    reactableId={pullRequest.id}
                    initialReactions={prReactions}
                  />
                </CardContent>
              </Card>

              {/* Comments */}
              {comments.map((comment: any) => (
                <Card key={comment.id}>
                  <CardHeader className="flex-row items-start justify-between gap-4 pb-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={comment.author?.avatar_url} />
                        <AvatarFallback>
                          {(comment.author?.username || 'U').slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <Link
                          href={`/${comment.author?.username}`}
                          className="font-medium hover:text-primary hover:underline"
                        >
                          {comment.author?.username}
                        </Link>
                        <span className="text-sm text-muted-foreground ml-2">
                          commented {formatRelativeTime(comment.created_at)}
                        </span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Markdown>{comment.body}</Markdown>
                    <Separator className="my-4" />
                    <Reactions
                      reactableType="comment"
                      reactableId={comment.id}
                      initialReactions={commentReactionsMap.get(comment.id) || []}
                    />
                  </CardContent>
                </Card>
              ))}

              {/* Merge status */}
              {pullRequest.state === 'open' && (
                <Card>
                  <CardContent className="py-4 space-y-4">
                    {pullRequest.draft ? (
                      <div className="flex items-center gap-3">
                        <AlertCircle className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">This pull request is still a work in progress</p>
                          <p className="text-sm text-muted-foreground">
                            Draft pull requests cannot be merged until marked as ready for review.
                          </p>
                        </div>
                      </div>
                    ) : pullRequest.mergeable ? (
                      <div className="flex items-center gap-3">
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                        <div>
                          <p className="font-medium">This branch has no conflicts with the base branch</p>
                          <p className="text-sm text-muted-foreground">
                            Merging can be performed automatically.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <AlertCircle className="h-5 w-5 text-yellow-600" />
                        <div>
                          <p className="font-medium">This branch has conflicts that must be resolved</p>
                          <p className="text-sm text-muted-foreground">
                            Resolve conflicts before merging.
                          </p>
                        </div>
                      </div>
                    )}
                    {canPublishDraft && (
                      <div>
                        <PRPublishButton pullRequestId={pullRequest.id} />
                      </div>
                    )}
                    {canMerge && (
                      <div>
                        <PRMergeButton
                          pullRequestId={pullRequest.id}
                          username={username}
                          repoName={repoName}
                        />
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Comment form */}
              {user ? (
                <PRCommentForm pullRequestId={pullRequest.id} />
              ) : (
                <Card>
                  <CardContent className="py-8 text-center">
                    <MessageSquare className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
                    <p className="text-muted-foreground mb-4">
                      Sign in to leave a comment
                    </p>
                    <Link href="/login">
                      <Button>Sign in</Button>
                    </Link>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Sidebar */}
            <aside className="w-full lg:w-64 space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Reviewers</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">No reviewers</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Assignees</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">No one assigned</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Labels</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">No labels</p>
                </CardContent>
              </Card>
            </aside>
          </div>
        </TabsContent>

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
                      <div className="text-sm text-muted-foreground mt-1">
                        {commit.author.name} committed{' '}
                        {formatRelativeTime(new Date(commit.author.timestamp * 1000).toISOString())}
                      </div>
                    </div>
                    <Link
                      href={`/${username}/${repoName}/commit/${commit.oid}`}
                      className="font-mono text-sm text-muted-foreground hover:text-primary"
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
                <p className="text-muted-foreground">No commits found in this pull request.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="files">
          {diff && diff.files.length > 0 ? (
            <div className="space-y-4">
              {/* Summary */}
              <Card>
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">
                      Showing <strong>{diff.totalFiles}</strong> changed file{diff.totalFiles !== 1 ? 's' : ''} with{' '}
                      <span className="text-green-600 font-medium">{diff.totalAdditions} additions</span> and{' '}
                      <span className="text-red-600 font-medium">{diff.totalDeletions} deletions</span>.
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* File list */}
              <Card>
                <CardContent className="p-0 divide-y">
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
          ) : (
            <Card>
              <CardContent className="py-8 text-center">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No file changes found in this pull request.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
