import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { BookOpen, Plus, Edit } from 'lucide-react';
import { getRepository } from '@/app/actions/repositories';
import { getWikiPage } from '@/app/actions/wiki';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Markdown } from '@/components/Markdown';
import { formatRelativeTime } from '@/lib/utils';

interface WikiHomePageProps {
  params: Promise<{
    username: string;
    repo: string;
  }>;
}

export default async function WikiHomePage({ params }: WikiHomePageProps) {
  const { username, repo: repoName } = await params;

  const repository = await getRepository(username, repoName);

  if (!repository || !repository.has_wiki) {
    notFound();
  }

  const homePage = await getWikiPage(repository.id, 'home');

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const canEdit = !!user;

  if (!homePage) {
    // No home page exists, show welcome message
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <BookOpen className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-2xl font-bold mb-2">Welcome to the wiki!</h2>
          <p className="text-muted-foreground max-w-md mx-auto mb-6">
            Wikis provide a place to document your project, share guides, and
            collaborate with your community.
          </p>
          {canEdit && (
            <Link href={`/${username}/${repoName}/wiki/new?title=Home&slug=home`}>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Create Home page
              </Button>
            </Link>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{homePage.title}</h1>
          <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
            <Avatar className="h-5 w-5">
              <AvatarImage src={homePage.last_editor?.avatar_url || homePage.author?.avatar_url || undefined} />
              <AvatarFallback className="text-xs">
                {(homePage.last_editor?.username || homePage.author?.username || 'U')
                  .slice(0, 2)
                  .toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span>
              {homePage.last_editor?.username || homePage.author?.username} edited{' '}
              {formatRelativeTime(homePage.updated_at)}
            </span>
          </div>
        </div>
        {canEdit && (
          <Link href={`/${username}/${repoName}/wiki/home/edit`}>
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
          <Markdown>{homePage.body}</Markdown>
        </CardContent>
      </Card>
    </div>
  );
}
