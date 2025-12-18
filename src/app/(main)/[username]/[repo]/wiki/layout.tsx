import Link from 'next/link';
import { notFound } from 'next/navigation';
import { BookOpen, FileText, Plus, Home as HomeIcon, Search } from 'lucide-react';
import { getRepository } from '@/app/actions/repositories';
import { getWikiPages } from '@/app/actions/wiki';
import { createClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

interface WikiLayoutProps {
  children: React.ReactNode;
  params: Promise<{
    username: string;
    repo: string;
  }>;
}

export default async function WikiLayout({ children, params }: WikiLayoutProps) {
  const { username, repo: repoName } = await params;

  const repository = await getRepository(username, repoName);

  if (!repository || !repository.has_wiki) {
    notFound();
  }

  const pages = await getWikiPages(repository.id);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Check if user can edit (authenticated and has access)
  const canEdit = !!user;

  return (
    <div className="container py-6">
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar */}
        <aside className="w-full lg:w-64 shrink-0">
          <div className="lg:sticky lg:top-6 space-y-4">
            {/* Header */}
            <div className="flex items-center gap-2 mb-4">
              <BookOpen className="h-5 w-5" />
              <h1 className="text-lg font-semibold">Wiki</h1>
            </div>

            {/* New page button */}
            {canEdit && (
              <Link href={`/${username}/${repoName}/wiki/new`}>
                <Button className="w-full gap-2" size="sm">
                  <Plus className="h-4 w-4" />
                  New page
                </Button>
              </Link>
            )}

            {/* Page list */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Pages</CardTitle>
              </CardHeader>
              <CardContent className="p-2">
                {pages.length > 0 ? (
                  <nav className="space-y-1">
                    <Link
                      href={`/${username}/${repoName}/wiki`}
                      className="flex items-center gap-2 px-2 py-1.5 rounded-md text-sm hover:bg-accent transition-colors"
                    >
                      <HomeIcon className="h-4 w-4 text-muted-foreground" />
                      Home
                    </Link>
                    {pages
                      .filter((p) => p.slug !== 'home')
                      .map((page) => (
                        <Link
                          key={page.id}
                          href={`/${username}/${repoName}/wiki/${page.slug}`}
                          className="flex items-center gap-2 px-2 py-1.5 rounded-md text-sm hover:bg-accent transition-colors"
                        >
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          {page.title}
                        </Link>
                      ))}
                  </nav>
                ) : (
                  <p className="text-sm text-muted-foreground px-2 py-4 text-center">
                    No pages yet.
                    {canEdit && ' Create the first page!'}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Clone info */}
            <Card>
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground">
                  Clone this wiki locally:
                </p>
                <code className="text-xs mt-1 block bg-muted p-2 rounded">
                  git clone {process.env.NEXT_PUBLIC_APP_URL}/{username}/{repoName}.wiki.git
                </code>
              </CardContent>
            </Card>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}
