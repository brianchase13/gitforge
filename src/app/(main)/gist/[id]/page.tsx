import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getGist } from '@/app/actions/gists';
import { createClient } from '@/lib/supabase/server';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { CodeViewer } from '@/components/repository/CodeViewer';
import { formatRelativeTime } from '@/lib/utils';
import { Globe, Lock, Pencil, GitFork, Star, Clock, FileCode, Copy } from 'lucide-react';

interface GistPageProps {
  params: Promise<{ id: string }>;
}

export default async function GistPage({ params }: GistPageProps) {
  const { id } = await params;
  const gist = await getGist(id);

  if (!gist) {
    notFound();
  }

  // Check if current user is the author
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isOwner = user?.id === gist.author_id;

  // Check visibility access
  if (gist.visibility === 'secret' && !isOwner) {
    notFound();
  }

  return (
    <div className="container max-w-4xl py-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div className="min-w-0">
          {gist.author && (
            <div className="flex items-center gap-2 mb-2">
              <Avatar className="h-6 w-6">
                <AvatarImage src={gist.author.avatar_url || undefined} />
                <AvatarFallback className="text-xs">
                  {gist.author.username.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <Link
                href={`/${gist.author.username}`}
                className="font-medium hover:text-primary"
              >
                {gist.author.username}
              </Link>
              <span className="text-muted-foreground">/</span>
              <span className="text-muted-foreground truncate">
                {gist.files?.[0]?.filename || 'gist'}
              </span>
            </div>
          )}
          {gist.description && (
            <p className="text-muted-foreground">{gist.description}</p>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Badge variant="outline">
            {gist.visibility === 'public' ? (
              <>
                <Globe className="h-3 w-3 mr-1" />
                Public
              </>
            ) : (
              <>
                <Lock className="h-3 w-3 mr-1" />
                Secret
              </>
            )}
          </Badge>
          {isOwner && (
            <Button asChild size="sm" variant="outline">
              <Link href={`/gist/${gist.id}/edit`}>
                <Pencil className="h-3 w-3 mr-1" />
                Edit
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 text-sm text-muted-foreground mb-6">
        <div className="flex items-center gap-1">
          <Clock className="h-4 w-4" />
          <span>Created {formatRelativeTime(gist.created_at)}</span>
        </div>
        {gist.stars_count > 0 && (
          <div className="flex items-center gap-1">
            <Star className="h-4 w-4" />
            <span>{gist.stars_count} stars</span>
          </div>
        )}
        {gist.forks_count > 0 && (
          <div className="flex items-center gap-1">
            <GitFork className="h-4 w-4" />
            <span>{gist.forks_count} forks</span>
          </div>
        )}
        <div className="flex items-center gap-1">
          <FileCode className="h-4 w-4" />
          <span>
            {gist.files_count} {gist.files_count === 1 ? 'file' : 'files'}
          </span>
        </div>
      </div>

      {/* Files */}
      <div className="space-y-4">
        {gist.files?.map((file) => (
          <Card key={file.id}>
            <CardHeader className="py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileCode className="h-4 w-4 text-muted-foreground" />
                  <span className="font-mono text-sm font-medium">
                    {file.filename}
                  </span>
                  {file.language && (
                    <Badge variant="secondary" className="text-xs">
                      {file.language}
                    </Badge>
                  )}
                </div>
                <span className="text-xs text-muted-foreground">
                  {file.size_bytes} bytes
                </span>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="rounded-md overflow-hidden border">
                <CodeViewer
                  content={file.content}
                  language={file.language || 'text'}
                  filename={file.filename}
                  showLineNumbers
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
