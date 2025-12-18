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
  GitPullRequest,
  FileText,
  FileCode,
  Zap,
  Cloud,
  Server,
  Heart,
  Code2,
  GitBranch,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ActivityFeed } from '@/components/activity/ActivityFeed';
import { getPublicActivityFeed } from '@/app/actions/activity';
import { formatRelativeTime } from '@/lib/utils';
import { TerminalDemo } from '@/components/landing/TerminalDemo';

const features = [
  {
    icon: BookOpen,
    title: 'Repositories',
    description: 'Host unlimited public repositories with full Git support.',
  },
  {
    icon: GitPullRequest,
    title: 'Issues & Pull Requests',
    description: 'Complete collaboration workflow with code review and discussions.',
  },
  {
    icon: FileText,
    title: 'Wiki',
    description: 'Built-in documentation with Markdown support for every repo.',
  },
  {
    icon: FileCode,
    title: 'Gists',
    description: 'Share code snippets and notes with syntax highlighting.',
  },
  {
    icon: Zap,
    title: 'Actions',
    description: 'Automated CI/CD workflows for your projects.',
    comingSoon: true,
  },
  {
    icon: Cloud,
    title: 'Serverless',
    description: 'No servers to manage. Scales automatically with demand.',
  },
];

const pillars = [
  {
    icon: Server,
    title: '100% Serverless',
    description: 'Built on Supabase and Vercel. Zero infrastructure to manage, infinite scalability.',
  },
  {
    icon: Code2,
    title: 'Open Source',
    description: 'Transparent, community-driven development. See how everything works.',
  },
  {
    icon: Heart,
    title: 'Free Forever',
    description: 'No hidden costs for public repos. Built by developers, for developers.',
  },
];

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

  const { count: starCount } = await supabase
    .from('stars')
    .select('*', { count: 'exact', head: true });

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden border-b bg-gradient-to-br from-primary/5 via-background to-purple-500/5 py-20 md:py-32">
        {/* Background pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#8882_1px,transparent_1px),linear-gradient(to_bottom,#8882_1px,transparent_1px)] bg-[size:24px_24px]" />

        <div className="container relative">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left side - Text */}
            <div className="flex flex-col gap-6 text-center lg:text-left">
              <Badge variant="secondary" className="w-fit mx-auto lg:mx-0">
                <GitBranch className="h-3 w-3 mr-1" />
                Open Source Git Hosting
              </Badge>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
                Where Code
                <br />
                <span className="text-primary">Comes to Life</span>
              </h1>
              <p className="text-xl text-muted-foreground max-w-lg mx-auto lg:mx-0">
                A lightweight, serverless Git hosting platform. Host repositories,
                collaborate with others, and build amazing software together.
              </p>
              <div className="flex gap-4 justify-center lg:justify-start">
                {user ? (
                  <>
                    <Button asChild size="lg" className="gap-2">
                      <Link href="/new">
                        <Plus className="h-4 w-4" />
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
                    <Button asChild size="lg" className="gap-2">
                      <Link href="/signup">
                        Get Started Free
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </Button>
                    <Button variant="outline" asChild size="lg">
                      <Link href="/explore">Explore Projects</Link>
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* Right side - Terminal */}
            <div className="hidden lg:block">
              <TerminalDemo />
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 md:py-24 border-b">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Everything you need to build
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              A complete platform for hosting code, tracking issues, reviewing changes,
              and shipping software.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => (
              <Card key={feature.title} className="relative group hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <feature.icon className="h-5 w-5 text-primary" />
                    </div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      {feature.title}
                      {feature.comingSoon && (
                        <Badge variant="secondary" className="text-xs">
                          Coming Soon
                        </Badge>
                      )}
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-sm">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Why GitForge Section */}
      <section className="py-16 md:py-24 border-b bg-muted/30">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Why GitForge?
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Built different from the ground up.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {pillars.map((pillar) => (
              <div key={pillar.title} className="text-center">
                <div className="inline-flex p-4 rounded-full bg-primary/10 mb-4">
                  <pillar.icon className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">{pillar.title}</h3>
                <p className="text-muted-foreground">{pillar.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 border-b">
        <div className="container">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="text-center p-4 rounded-lg bg-gradient-to-br from-primary/5 to-transparent">
              <div className="text-3xl md:text-4xl font-bold text-primary">{userCount || 0}</div>
              <div className="text-sm text-muted-foreground flex items-center justify-center gap-1 mt-1">
                <Users className="h-4 w-4" />
                Users
              </div>
            </div>
            <div className="text-center p-4 rounded-lg bg-gradient-to-br from-blue-500/5 to-transparent">
              <div className="text-3xl md:text-4xl font-bold text-blue-600 dark:text-blue-400">{repoCount || 0}</div>
              <div className="text-sm text-muted-foreground flex items-center justify-center gap-1 mt-1">
                <BookOpen className="h-4 w-4" />
                Repositories
              </div>
            </div>
            <div className="text-center p-4 rounded-lg bg-gradient-to-br from-yellow-500/5 to-transparent">
              <div className="text-3xl md:text-4xl font-bold text-yellow-600 dark:text-yellow-400">{starCount || 0}</div>
              <div className="text-sm text-muted-foreground flex items-center justify-center gap-1 mt-1">
                <Star className="h-4 w-4" />
                Stars Given
              </div>
            </div>
            <div className="text-center p-4 rounded-lg bg-gradient-to-br from-green-500/5 to-transparent">
              <div className="text-3xl md:text-4xl font-bold text-green-600 dark:text-green-400">100%</div>
              <div className="text-sm text-muted-foreground mt-1">
                Serverless
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trending & Activity Section */}
      <section className="py-12 md:py-16">
        <div className="container">
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Trending Repositories */}
            <div className="lg:col-span-2">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
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
                      <Card key={repo.id} className="hover:shadow-md transition-shadow">
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
        <section className="py-16 md:py-24 border-t bg-gradient-to-br from-primary/5 via-background to-purple-500/5">
          <div className="container">
            <div className="text-center max-w-2xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Ready to start building?
              </h2>
              <p className="text-lg text-muted-foreground mb-8">
                Join GitForge today and start hosting your code for free.
                No credit card required.
              </p>
              <div className="flex gap-4 justify-center">
                <Button asChild size="lg" className="gap-2">
                  <Link href="/signup">
                    Create an account
                    <ArrowRight className="h-4 w-4" />
                  </Link>
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
