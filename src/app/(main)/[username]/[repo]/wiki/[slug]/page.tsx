import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Edit, Clock, User } from 'lucide-react';
import { getRepository } from '@/app/actions/repositories';
import { getWikiPage } from '@/app/actions/wiki';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Markdown } from '@/components/Markdown';
import { formatRelativeTime } from '@/lib/utils';

interface WikiPageViewProps {
  params: Promise<{
    username: string;
    repo: string;
    slug: string;
  }>;
}

export default async function WikiPageView({ params }: WikiPageViewProps) {
  const { username, repo: repoName, slug } = await params;

  const repository = await getRepository(username, repoName);

  if (!repository || !repository.has_wiki) {
    notFound();
  }

  const page = await getWikiPage(repository.id, slug);

  if (!page) {
    notFound();
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const canEdit = !!user;

  return (
    <div className="space-y-4">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{page.title}</h1>
          <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
            <Avatar className="h-5 w-5">
              <AvatarImage
                src={page.last_editor?.avatar_url || page.author?.avatar_url || undefined}
              />
              <AvatarFallback className="text-xs">
                {(page.last_editor?.username || page.author?.username || 'U')
                  .slice(0, 2)
                  .toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span>
              {page.last_editor?.username || page.author?.username} edited{' '}
              {formatRelativeTime(page.updated_at)}
            </span>
          </div>
        </div>
        {canEdit && (
          <Link href={`/${username}/${repoName}/wiki/${slug}/edit`}>
            <Button variant="outline" size="sm" className="gap-2">
              <Edit className="h-4 w-4" />
              Edit
            </Button>
          </Link>
        )}
      </div>

      {/* Page content */}
      <Card>
        <CardContent className="pt-6 prose prose-sm dark:prose-invert max-w-none">
          <Markdown>{page.body}</Markdown>
        </CardContent>
      </Card>

      {/* Page footer */}
      <div className="flex items-center justify-between text-xs text-muted-foreground border-t pt-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <User className="h-3.5 w-3.5" />
            <span>
              Created by{' '}
              <Link
                href={`/${page.author?.username}`}
                className="hover:text-primary"
              >
                {page.author?.username}
              </Link>
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            <span>Created {formatRelativeTime(page.created_at)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
