import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Tag, Plus, Package, Calendar, User } from 'lucide-react';
import { getRepository } from '@/app/actions/repositories';
import { getReleases } from '@/app/actions/releases';
import { getGitRepository } from '@/lib/git';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Markdown } from '@/components/Markdown';
import { formatRelativeTime } from '@/lib/utils';

interface ReleasesPageProps {
  params: Promise<{
    username: string;
    repo: string;
  }>;
  searchParams: Promise<{
    page?: string;
  }>;
}

export default async function ReleasesPage({
  params,
  searchParams,
}: ReleasesPageProps) {
  const { username, repo: repoName } = await params;
  const query = await searchParams;

  const repository = await getRepository(username, repoName);

  if (!repository) {
    notFound();
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isOwner = user?.id === repository.owner_id;

  // Get releases
  const page = parseInt(query.page || '1');
  const { releases, total } = await getReleases(username, repoName, {
    page,
    perPage: 10,
    includeDrafts: isOwner,
  });

  // Get tags from git
  let tags: string[] = [];
  try {
    const gitRepo = await getGitRepository(repository.storage_path);
    tags = await gitRepo.listTags();
  } catch {
    // Ignore errors
  }

  const totalPages = Math.ceil(total / 10);

  return (
    <div className="container py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Releases</h1>
        {isOwner && (
          <Link href={`/${username}/${repoName}/releases/new`}>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Draft a new release
            </Button>
          </Link>
        )}
      </div>

      <div className="grid lg:grid-cols-4 gap-6">
        {/* Releases list */}
        <div className="lg:col-span-3 space-y-6">
          {releases.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No releases yet</h3>
                <p className="text-muted-foreground mb-4">
                  Releases are deployable software iterations you can package and make available for a wider audience to download and use.
                </p>
                {isOwner && (
                  <Link href={`/${username}/${repoName}/releases/new`}>
                    <Button>Create a new release</Button>
                  </Link>
                )}
              </CardContent>
            </Card>
          ) : (
            <>
              {releases.map((release, idx) => (
                <Card key={release.id} className={idx === 0 ? 'border-primary' : ''}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Link
                            href={`/${username}/${repoName}/releases/tag/${release.tag_name}`}
                            className="text-xl font-semibold hover:text-primary"
                          >
                            {release.name || release.tag_name}
                          </Link>
                          {idx === 0 && !release.draft && !release.prerelease && (
                            <Badge className="bg-green-600">Latest</Badge>
                          )}
                          {release.draft && (
                            <Badge variant="secondary">Draft</Badge>
                          )}
                          {release.prerelease && (
                            <Badge variant="outline">Pre-release</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Tag className="h-4 w-4" />
                            {release.tag_name}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {formatRelativeTime(release.published_at || release.created_at)}
                          </span>
                          {release.author && (
                            <Link
                              href={`/${release.author.username}`}
                              className="flex items-center gap-1 hover:text-primary"
                            >
                              <Avatar className="h-5 w-5">
                                <AvatarImage src={release.author.avatar_url || undefined} />
                                <AvatarFallback>
                                  {release.author.username[0].toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              {release.author.username}
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  {release.body && (
                    <CardContent>
                      <div className="prose prose-sm dark:prose-invert max-w-none">
                        <Markdown>{release.body}</Markdown>
                      </div>
                    </CardContent>
                  )}
                </Card>
              ))}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2">
                  {page > 1 && (
                    <Link
                      href={`/${username}/${repoName}/releases?page=${page - 1}`}
                    >
                      <Button variant="outline">Previous</Button>
                    </Link>
                  )}
                  <span className="text-sm text-muted-foreground">
                    Page {page} of {totalPages}
                  </span>
                  {page < totalPages && (
                    <Link
                      href={`/${username}/${repoName}/releases?page=${page + 1}`}
                    >
                      <Button variant="outline">Next</Button>
                    </Link>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Tags sidebar */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Tag className="h-4 w-4" />
                Tags
              </CardTitle>
            </CardHeader>
            <CardContent>
              {tags.length === 0 ? (
                <p className="text-sm text-muted-foreground">No tags yet</p>
              ) : (
                <ul className="space-y-2">
                  {tags.slice(0, 10).map((tag) => (
                    <li key={tag}>
                      <Link
                        href={`/${username}/${repoName}/tree/${tag}`}
                        className="text-sm hover:text-primary flex items-center gap-2"
                      >
                        <Tag className="h-3 w-3" />
                        {tag}
                      </Link>
                    </li>
                  ))}
                  {tags.length > 10 && (
                    <li className="text-sm text-muted-foreground">
                      and {tags.length - 10} more...
                    </li>
                  )}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
