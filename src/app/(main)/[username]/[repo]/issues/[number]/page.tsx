import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  CircleDot,
  CheckCircle2,
  Calendar,
  Edit,
  MoreHorizontal,
  MessageSquare,
} from 'lucide-react';
import { getRepository } from '@/app/actions/repositories';
import { getIssue, getIssueComments, getLabels } from '@/app/actions/issues';
import { getReactions, getReactionsForMany } from '@/app/actions/reactions';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { formatRelativeTime } from '@/lib/utils';
import { IssueCommentForm } from '@/components/issues/IssueCommentForm';
import { IssueActions } from '@/components/issues/IssueActions';
import { Markdown } from '@/components/Markdown';
import { Reactions } from '@/components/reactions';

interface IssuePageProps {
  params: Promise<{
    username: string;
    repo: string;
    number: string;
  }>;
}

export default async function IssuePage({ params }: IssuePageProps) {
  const { username, repo: repoName, number: numberStr } = await params;
  const number = parseInt(numberStr);

  if (isNaN(number)) {
    notFound();
  }

  const repository = await getRepository(username, repoName);

  if (!repository) {
    notFound();
  }

  const issue = await getIssue(username, repoName, number);

  if (!issue) {
    notFound();
  }

  const comments = await getIssueComments(issue.id);
  const labels = await getLabels(repository.id);

  // Fetch reactions for the issue and all comments
  const issueReactions = await getReactions('issue', issue.id);
  const commentIds = comments.map((c) => c.id);
  const commentReactionsMap = commentIds.length > 0
    ? await getReactionsForMany('comment', commentIds)
    : new Map();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isAuthor = user?.id === issue.author_id;
  const isOwner = user?.id === repository.owner_id;
  const canEdit = isAuthor || isOwner;

  return (
    <div className="container py-6">
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Main content */}
        <div className="flex-1 min-w-0">
          {/* Issue header */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold mb-2">
              {issue.title}
              <span className="text-muted-foreground font-normal ml-2">
                #{issue.number}
              </span>
            </h1>
            <div className="flex items-center gap-3 flex-wrap">
              <Badge
                variant={issue.state === 'open' ? 'default' : 'secondary'}
                className={
                  issue.state === 'open'
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-purple-600 hover:bg-purple-700'
                }
              >
                {issue.state === 'open' ? (
                  <CircleDot className="h-3 w-3 mr-1" />
                ) : (
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                )}
                {issue.state === 'open' ? 'Open' : 'Closed'}
              </Badge>
              <span className="text-sm text-muted-foreground">
                <Link
                  href={`/${(issue as any).author?.username}`}
                  className="font-medium hover:text-primary hover:underline"
                >
                  {(issue as any).author?.username}
                </Link>
                {' opened this issue '}
                {formatRelativeTime(issue.created_at)}
                {' · '}
                {comments.length} comment{comments.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>

          {/* Issue body */}
          <Card className="mb-6">
            <CardHeader className="flex-row items-start justify-between gap-4 pb-3">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={(issue as any).author?.avatar_url} />
                  <AvatarFallback>
                    {((issue as any).author?.username || 'U').slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <Link
                    href={`/${(issue as any).author?.username}`}
                    className="font-medium hover:text-primary hover:underline"
                  >
                    {(issue as any).author?.username}
                  </Link>
                  <span className="text-sm text-muted-foreground ml-2">
                    commented {formatRelativeTime(issue.created_at)}
                  </span>
                </div>
              </div>
              {canEdit && (
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {issue.body ? (
                <Markdown>{issue.body}</Markdown>
              ) : (
                <p className="text-muted-foreground italic">No description provided.</p>
              )}
              <Separator className="my-4" />
              <Reactions
                reactableType="issue"
                reactableId={issue.id}
                initialReactions={issueReactions}
              />
            </CardContent>
          </Card>

          {/* Comments */}
          {comments.length > 0 && (
            <div className="space-y-4 mb-6">
              {comments.map((comment) => (
                <Card key={comment.id}>
                  <CardHeader className="flex-row items-start justify-between gap-4 pb-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={(comment as any).author?.avatar_url} />
                        <AvatarFallback>
                          {((comment as any).author?.username || 'U').slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <Link
                          href={`/${(comment as any).author?.username}`}
                          className="font-medium hover:text-primary hover:underline"
                        >
                          {(comment as any).author?.username}
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
            </div>
          )}

          {/* Comment form */}
          {user ? (
            <IssueCommentForm issueId={issue.id} />
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
          {/* Actions */}
          {canEdit && (
            <IssueActions
              issueId={issue.id}
              currentState={issue.state}
              username={username}
              repoName={repoName}
            />
          )}

          {/* Assignees */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center justify-between">
                Assignees
                {canEdit && (
                  <Button variant="ghost" size="sm" className="h-6 px-2">
                    <Edit className="h-3 w-3" />
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {(issue as any).assignees?.length > 0 ? (
                <div className="space-y-2">
                  {(issue as any).assignees.map((a: any) => (
                    <Link
                      key={a.user.id}
                      href={`/${a.user.username}`}
                      className="flex items-center gap-2 text-sm hover:text-primary"
                    >
                      <Avatar className="h-5 w-5">
                        <AvatarImage src={a.user.avatar_url} />
                        <AvatarFallback className="text-xs">
                          {a.user.username.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      {a.user.username}
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No one assigned</p>
              )}
            </CardContent>
          </Card>

          {/* Labels */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center justify-between">
                Labels
                {canEdit && (
                  <Button variant="ghost" size="sm" className="h-6 px-2">
                    <Edit className="h-3 w-3" />
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {(issue as any).labels?.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {(issue as any).labels.map((il: any) => (
                    <Badge
                      key={il.label.id}
                      variant="outline"
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
              ) : (
                <p className="text-sm text-muted-foreground">No labels</p>
              )}
            </CardContent>
          </Card>

          {/* Milestone placeholder */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center justify-between">
                Milestone
                {canEdit && (
                  <Button variant="ghost" size="sm" className="h-6 px-2">
                    <Edit className="h-3 w-3" />
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">No milestone</p>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
