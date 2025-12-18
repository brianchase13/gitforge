import { notFound } from 'next/navigation';
import Link from 'next/link';
import {
  MapPin,
  Link as LinkIcon,
  Calendar,
  BookOpen,
  Star,
  Users,
  GitFork,
  Lock,
  Globe,
  Activity,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { getUserRepositories } from '@/app/actions/repositories';
import { getUserActivityFeed } from '@/app/actions/activity';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ActivityFeed } from '@/components/activity/ActivityFeed';
import { formatRelativeTime, formatNumber } from '@/lib/utils';

interface UserProfilePageProps {
  params: Promise<{
    username: string;
  }>;
  searchParams: Promise<{
    tab?: string;
  }>;
}

export default async function UserProfilePage({
  params,
  searchParams,
}: UserProfilePageProps) {
  const { username } = await params;
  const { tab = 'repositories' } = await searchParams;

  const supabase = await createClient();

  // Get user profile
  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('username', username)
    .single();

  if (!profile) {
    notFound();
  }

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isOwnProfile = user?.id === profile.id;

  // Get repositories
  const repositories = await getUserRepositories(username);

  // Filter repositories based on visibility
  const visibleRepositories = isOwnProfile
    ? repositories
    : repositories.filter((r) => r.visibility === 'public');

  // Get starred repos
  const { data: starredRepos } = await supabase
    .from('stars')
    .select('repository_id, repositories(*)')
    .eq('user_id', profile.id);

  // Get user activity
  const activityEvents = await getUserActivityFeed(username, 20);

  return (
    <div className="container py-8">
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Profile sidebar */}
        <aside className="w-full lg:w-80 shrink-0">
          <div className="sticky top-20">
            {/* Avatar and name */}
            <div className="text-center lg:text-left">
              <Avatar className="h-64 w-64 mx-auto lg:mx-0">
                <AvatarImage src={profile.avatar_url || undefined} />
                <AvatarFallback className="text-6xl">
                  {profile.username.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <h1 className="text-2xl font-bold mt-4">
                {profile.display_name || profile.username}
              </h1>
              <p className="text-xl text-muted-foreground">{profile.username}</p>
            </div>

            {/* Bio */}
            {profile.bio && (
              <p className="mt-4 text-sm">{profile.bio}</p>
            )}

            {/* Edit button */}
            {isOwnProfile && (
              <Link href="/settings/profile" className="block mt-4">
                <Button variant="outline" className="w-full">
                  Edit profile
                </Button>
              </Link>
            )}

            {/* Info */}
            <div className="mt-6 space-y-2 text-sm">
              {profile.location && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  <span>{profile.location}</span>
                </div>
              )}
              {profile.website && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <LinkIcon className="h-4 w-4" />
                  <a
                    href={profile.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    {profile.website.replace(/^https?:\/\//, '')}
                  </a>
                </div>
              )}
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>Joined {formatRelativeTime(profile.created_at)}</span>
              </div>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <div className="flex-1 min-w-0">
          <Tabs defaultValue={tab} className="w-full">
            <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent">
              <TabsTrigger
                value="repositories"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
              >
                <BookOpen className="h-4 w-4 mr-2" />
                Repositories
                <Badge variant="secondary" className="ml-2">
                  {visibleRepositories.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger
                value="stars"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
              >
                <Star className="h-4 w-4 mr-2" />
                Stars
                <Badge variant="secondary" className="ml-2">
                  {starredRepos?.length || 0}
                </Badge>
              </TabsTrigger>
              <TabsTrigger
                value="activity"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
              >
                <Activity className="h-4 w-4 mr-2" />
                Activity
              </TabsTrigger>
            </TabsList>

            <TabsContent value="repositories" className="mt-6">
              {visibleRepositories.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center">
                    <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">No repositories yet</h3>
                    <p className="text-muted-foreground mb-4">
                      {isOwnProfile
                        ? "You haven't created any repositories yet."
                        : `${profile.username} hasn't created any public repositories yet.`}
                    </p>
                    {isOwnProfile && (
                      <Link href="/new">
                        <Button>Create your first repository</Button>
                      </Link>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {visibleRepositories.map((repo) => (
                    <RepositoryCard key={repo.id} repo={repo} username={username} />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="stars" className="mt-6">
              {!starredRepos || starredRepos.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center">
                    <Star className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">No starred repositories</h3>
                    <p className="text-muted-foreground">
                      {isOwnProfile
                        ? "You haven't starred any repositories yet."
                        : `${profile.username} hasn't starred any repositories yet.`}
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {starredRepos.map(
                    (star) =>
                      star.repositories && (
                        <RepositoryCard
                          key={star.repository_id}
                          repo={star.repositories as any}
                          username={username}
                        />
                      )
                  )}
                </div>
              )}
            </TabsContent>

            <TabsContent value="activity" className="mt-6">
              {activityEvents.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center">
                    <Activity className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">No activity yet</h3>
                    <p className="text-muted-foreground">
                      {isOwnProfile
                        ? "You haven't had any activity yet."
                        : `${profile.username} hasn't had any public activity yet.`}
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="py-4">
                    <ActivityFeed events={activityEvents} showActor={false} />
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

function RepositoryCard({
  repo,
  username,
}: {
  repo: {
    id: string;
    name: string;
    description: string | null;
    visibility: string;
    stars_count: number;
    forks_count: number;
    updated_at: string;
    is_fork: boolean;
  };
  username: string;
}) {
  return (
    <Card>
      <CardContent className="py-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Link
                href={`/${username}/${repo.name}`}
                className="text-primary hover:underline font-semibold text-lg"
              >
                {repo.name}
              </Link>
              <Badge variant="outline" className="text-xs">
                {repo.visibility === 'public' ? (
                  <>
                    <Globe className="h-3 w-3 mr-1" />
                    Public
                  </>
                ) : (
                  <>
                    <Lock className="h-3 w-3 mr-1" />
                    Private
                  </>
                )}
              </Badge>
              {repo.is_fork && (
                <Badge variant="secondary" className="text-xs">
                  <GitFork className="h-3 w-3 mr-1" />
                  Fork
                </Badge>
              )}
            </div>
            {repo.description && (
              <p className="text-muted-foreground text-sm mt-1 line-clamp-2">
                {repo.description}
              </p>
            )}
            <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
              {repo.stars_count > 0 && (
                <span className="flex items-center gap-1">
                  <Star className="h-4 w-4" />
                  {formatNumber(repo.stars_count)}
                </span>
              )}
              {repo.forks_count > 0 && (
                <span className="flex items-center gap-1">
                  <GitFork className="h-4 w-4" />
                  {formatNumber(repo.forks_count)}
                </span>
              )}
              <span>Updated {formatRelativeTime(repo.updated_at)}</span>
            </div>
          </div>
          <Button variant="outline" size="sm" className="shrink-0">
            <Star className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
