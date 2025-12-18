import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import {
  BookOpen,
  Star,
  GitFork,
  Users,
  TrendingUp,
  Plus,
  ArrowRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ActivityFeed } from '@/components/activity/ActivityFeed';
import { getPublicActivityFeed } from '@/app/actions/activity';
import { formatRelativeTime } from '@/lib/utils';

export default async function Home() {
  const supabase = await createClient();

  // Check if user is logged in
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Get trending repositories
  const { data: trendingRepos } = await supabase
    .from('repositories')
    .select(`
      id,
      name,
      description,
      stars_count,
      forks_count,
      updated_at,
      owner:users!repositories_owner_id_fkey(id, username, avatar_url)
    `)
    .eq('visibility', 'public')
    .order('stars_count', { ascending: false })
    .limit(6);

  // Get recent activity
  const activityEvents = await getPublicActivityFeed(10);

  // Get stats
  const { count: userCount } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true });

  const { count: repoCount } = await supabase
    .from('repositories')
    .select('*', { count: 'exact', head: true })
    .eq('visibility', 'public');

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="border-b bg-gradient-to-b from-background to-muted/30 py-16 md:py-24">
        <div className="container">
          <div className="flex flex-col items-center text-center gap-6 max-w-3xl mx-auto">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
              Where code lives
            </h1>
            <p className="text-xl text-muted-foreground max-w-xl">
              GitForge is a lightweight, serverless Git hosting platform. Host your repositories,
              collaborate with others, and build amazing software.
            </p>
            <div className="flex gap-4 mt-4">
              {user ? (
                <>
                  <Button asChild size="lg">
                    <Link href="/new">
                      <Plus className="h-4 w-4 mr-2" />
                      New Repository
                    </Link>
                  </Button>
                  <Button variant="outline" asChild size="lg">
                    <Link href="/explore">
                      Explore
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Link>
                  </Button>
                </>
              ) : (
                <>
                  <Button asChild size="lg">
                    <Link href="/signup">Get Started</Link>
                  </Button>
                  <Button variant="outline" asChild size="lg">
                    <Link href="/explore">
                      Explore
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Link>
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 border-b">
        <div className="container">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="text-3xl font-bold">{userCount || 0}</div>
              <div className="text-sm text-muted-foreground flex items-center justify-center gap-1">
                <Users className="h-4 w-4" />
                Users
              </div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold">{repoCount || 0}</div>
              <div className="text-sm text-muted-foreground flex items-center justify-center gap-1">
                <BookOpen className="h-4 w-4" />
                Repositories
              </div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold">100%</div>
              <div className="text-sm text-muted-foreground">Serverless</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold">Free</div>
              <div className="text-sm text-muted-foreground">Open Source</div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-12">
        <div className="container">
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Trending Repositories */}
            <div className="lg:col-span-2">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Trending Repositories
                </h2>
                <Button variant="ghost" asChild>
                  <Link href="/explore">
                    See all
                    <ArrowRight className="h-4 w-4 ml-1" />
                  </Link>
                </Button>
              </div>

              {trendingRepos?.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">No repositories yet</h3>
                    <p className="text-muted-foreground mb-4">
                      Be the first to create a public repository!
                    </p>
                    {user && (
                      <Button asChild>
                        <Link href="/new">Create Repository</Link>
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <div className="grid md:grid-cols-2 gap-4">
                  {trendingRepos?.map((repo) => {
                    const owner = repo.owner as unknown as { id: string; username: string; avatar_url: string | null };
                    return (
                      <Card key={repo.id}>
                        <CardHeader className="pb-2">
                          <div className="flex items-start gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={owner?.avatar_url || undefined} />
                              <AvatarFallback>
                                {owner?.username?.slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 flex-1">
                              <CardTitle className="text-sm">
                                <Link
                                  href={`/${owner?.username}/${repo.name}`}
                                  className="hover:text-primary hover:underline"
                                >
                                  {owner?.username}/{repo.name}
                                </Link>
                              </CardTitle>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <CardDescription className="line-clamp-2 mb-3 text-xs">
                            {repo.description || 'No description'}
                          </CardDescription>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Star className="h-3 w-3" />
                              {repo.stars_count}
                            </span>
                            <span className="flex items-center gap-1">
                              <GitFork className="h-3 w-3" />
                              {repo.forks_count}
                            </span>
                            <span>Updated {formatRelativeTime(repo.updated_at)}</span>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Activity Feed */}
            <div>
              <h2 className="text-2xl font-bold mb-6">Recent Activity</h2>
              {activityEvents.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center">
                    <p className="text-muted-foreground">No activity yet</p>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="py-4">
                    <ActivityFeed events={activityEvents} />
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      {!user && (
        <section className="py-16 border-t bg-muted/30">
          <div className="container">
            <div className="text-center max-w-2xl mx-auto">
              <h2 className="text-3xl font-bold mb-4">Ready to get started?</h2>
              <p className="text-muted-foreground mb-8">
                Join GitForge today and start hosting your code for free.
              </p>
              <div className="flex gap-4 justify-center">
                <Button asChild size="lg">
                  <Link href="/signup">Create an account</Link>
                </Button>
                <Button variant="outline" asChild size="lg">
                  <Link href="/login">Sign in</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
