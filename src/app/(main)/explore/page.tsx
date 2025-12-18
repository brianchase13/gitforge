import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import {
  BookOpen,
  Star,
  GitFork,
  TrendingUp,
  Clock,
  Flame,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatRelativeTime } from '@/lib/utils';

export const metadata = {
  title: 'Explore - GitForge',
  description: 'Discover trending repositories and projects on GitForge',
};

export default async function ExplorePage() {
  const supabase = await createClient();

  // Get trending repositories (most stars)
  const { data: trendingRepos } = await supabase
    .from('repositories')
    .select(`
      id,
      name,
      description,
      visibility,
      stars_count,
      forks_count,
      updated_at,
      created_at,
      owner:users!repositories_owner_id_fkey(id, username, avatar_url)
    `)
    .eq('visibility', 'public')
    .order('stars_count', { ascending: false })
    .limit(12);

  // Get recently created repositories
  const { data: recentRepos } = await supabase
    .from('repositories')
    .select(`
      id,
      name,
      description,
      visibility,
      stars_count,
      forks_count,
      updated_at,
      created_at,
      owner:users!repositories_owner_id_fkey(id, username, avatar_url)
    `)
    .eq('visibility', 'public')
    .order('created_at', { ascending: false })
    .limit(12);

  // Get recently updated repositories
  const { data: activeRepos } = await supabase
    .from('repositories')
    .select(`
      id,
      name,
      description,
      visibility,
      stars_count,
      forks_count,
      updated_at,
      created_at,
      owner:users!repositories_owner_id_fkey(id, username, avatar_url)
    `)
    .eq('visibility', 'public')
    .order('updated_at', { ascending: false })
    .limit(12);

  return (
    <div className="container py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Explore</h1>
        <p className="text-muted-foreground">
          Discover interesting projects and connect with the community
        </p>
      </div>

      <Tabs defaultValue="trending" className="space-y-6">
        <TabsList>
          <TabsTrigger value="trending" className="gap-2">
            <Flame className="h-4 w-4" />
            Trending
          </TabsTrigger>
          <TabsTrigger value="recent" className="gap-2">
            <Clock className="h-4 w-4" />
            New
          </TabsTrigger>
          <TabsTrigger value="active" className="gap-2">
            <TrendingUp className="h-4 w-4" />
            Active
          </TabsTrigger>
        </TabsList>

        <TabsContent value="trending">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {trendingRepos?.length === 0 ? (
              <div className="col-span-full text-center py-12">
                <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No repositories yet</h3>
                <p className="text-muted-foreground">
                  Be the first to create a public repository!
                </p>
              </div>
            ) : (
              trendingRepos?.map((repo) => (
                <RepositoryCard key={repo.id} repo={repo} />
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="recent">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {recentRepos?.length === 0 ? (
              <div className="col-span-full text-center py-12">
                <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No repositories yet</h3>
                <p className="text-muted-foreground">
                  Be the first to create a public repository!
                </p>
              </div>
            ) : (
              recentRepos?.map((repo) => (
                <RepositoryCard key={repo.id} repo={repo} showCreated />
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="active">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {activeRepos?.length === 0 ? (
              <div className="col-span-full text-center py-12">
                <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No repositories yet</h3>
                <p className="text-muted-foreground">
                  Be the first to create a public repository!
                </p>
              </div>
            ) : (
              activeRepos?.map((repo) => (
                <RepositoryCard key={repo.id} repo={repo} />
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function RepositoryCard({
  repo,
  showCreated = false,
}: {
  repo: any;
  showCreated?: boolean;
}) {
  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-2">
        <div className="flex items-start gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={repo.owner?.avatar_url || undefined} />
            <AvatarFallback>
              {repo.owner?.username?.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <CardTitle className="text-base truncate">
              <Link
                href={`/${repo.owner?.username}/${repo.name}`}
                className="hover:text-primary hover:underline"
              >
                {repo.owner?.username}/{repo.name}
              </Link>
            </CardTitle>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col">
        <CardDescription className="flex-1 line-clamp-2 mb-4">
          {repo.description || 'No description provided'}
        </CardDescription>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Star className="h-4 w-4" />
            {repo.stars_count}
          </span>
          <span className="flex items-center gap-1">
            <GitFork className="h-4 w-4" />
            {repo.forks_count}
          </span>
          <span className="text-xs">
            {showCreated
              ? `Created ${formatRelativeTime(repo.created_at)}`
              : `Updated ${formatRelativeTime(repo.updated_at)}`}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
