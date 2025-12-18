import { notFound } from 'next/navigation';
import Link from 'next/link';
import {
  Code,
  CircleDot,
  GitPullRequest,
  Play,
  Settings,
  Star,
  GitFork,
  Eye,
  Lock,
  Globe,
  Search,
  Tag,
  BarChart3,
  BookOpen,
} from 'lucide-react';
import { getRepository } from '@/app/actions/repositories';
import { createClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatNumber } from '@/lib/utils';

interface RepositoryLayoutProps {
  children: React.ReactNode;
  params: Promise<{
    username: string;
    repo: string;
  }>;
}

export default async function RepositoryLayout({
  children,
  params,
}: RepositoryLayoutProps) {
  const { username, repo: repoName } = await params;
  const repository = await getRepository(username, repoName);

  if (!repository) {
    notFound();
  }

  // Get owner info
  const supabase = await createClient();
  const { data: owner } = await supabase
    .from('users')
    .select('username, display_name, avatar_url')
    .eq('id', repository.owner_id)
    .single();

  // Get current user to check permissions
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isOwner = user?.id === repository.owner_id;

  // Check if starred
  let isStarred = false;
  if (user) {
    const { data: star } = await supabase
      .from('stars')
      .select('id')
      .eq('user_id', user.id)
      .eq('repository_id', repository.id)
      .single();
    isStarred = !!star;
  }

  const tabs = [
    {
      label: 'Code',
      href: `/${username}/${repoName}`,
      icon: Code,
    },
    {
      label: 'Issues',
      href: `/${username}/${repoName}/issues`,
      icon: CircleDot,
      count: repository.open_issues_count,
      show: repository.has_issues,
    },
    {
      label: 'Pull requests',
      href: `/${username}/${repoName}/pulls`,
      icon: GitPullRequest,
      show: repository.has_pull_requests,
    },
    {
      label: 'Actions',
      href: `/${username}/${repoName}/actions`,
      icon: Play,
    },
    {
      label: 'Search',
      href: `/${username}/${repoName}/search`,
      icon: Search,
    },
    {
      label: 'Releases',
      href: `/${username}/${repoName}/releases`,
      icon: Tag,
    },
    {
      label: 'Wiki',
      href: `/${username}/${repoName}/wiki`,
      icon: BookOpen,
      show: repository.has_wiki,
    },
    {
      label: 'Insights',
      href: `/${username}/${repoName}/insights`,
      icon: BarChart3,
    },
    {
      label: 'Settings',
      href: `/${username}/${repoName}/settings`,
      icon: Settings,
      show: isOwner,
    },
  ].filter((tab) => tab.show !== false);

  return (
    <div className="min-h-screen">
      {/* Repository header */}
      <div className="border-b bg-muted/30">
        <div className="container py-4">
          {/* Repo name and visibility */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2 flex-wrap">
              <Link
                href={`/${username}`}
                className="text-primary hover:underline font-medium"
              >
                {owner?.username || username}
              </Link>
              <span className="text-muted-foreground">/</span>
              <Link
                href={`/${username}/${repoName}`}
                className="text-primary hover:underline font-semibold text-lg"
              >
                {repository.name}
              </Link>
              <Badge variant="outline" className="gap-1">
                {repository.visibility === 'public' ? (
                  <>
                    <Globe className="h-3 w-3" />
                    Public
                  </>
                ) : (
                  <>
                    <Lock className="h-3 w-3" />
                    Private
                  </>
                )}
              </Badge>
              {repository.is_fork && (
                <Badge variant="secondary">Forked</Badge>
              )}
              {repository.is_archived && (
                <Badge variant="destructive">Archived</Badge>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <div className="flex items-center border rounded-md">
                <Button variant="ghost" size="sm" className="gap-1 rounded-r-none">
                  <Eye className="h-4 w-4" />
                  Watch
                </Button>
                <div className="border-l px-2 text-sm">
                  {formatNumber(repository.watchers_count)}
                </div>
              </div>

              <div className="flex items-center border rounded-md">
                <Button
                  variant="ghost"
                  size="sm"
                  className={`gap-1 rounded-r-none ${isStarred ? 'text-yellow-500' : ''}`}
                >
                  <Star className={`h-4 w-4 ${isStarred ? 'fill-current' : ''}`} />
                  {isStarred ? 'Starred' : 'Star'}
                </Button>
                <div className="border-l px-2 text-sm">
                  {formatNumber(repository.stars_count)}
                </div>
              </div>

              <div className="flex items-center border rounded-md">
                <Button variant="ghost" size="sm" className="gap-1 rounded-r-none">
                  <GitFork className="h-4 w-4" />
                  Fork
                </Button>
                <div className="border-l px-2 text-sm">
                  {formatNumber(repository.forks_count)}
                </div>
              </div>
            </div>
          </div>

          {/* Description */}
          {repository.description && (
            <p className="text-muted-foreground mt-2">{repository.description}</p>
          )}

          {/* Tabs */}
          <nav className="flex items-center gap-1 mt-4 -mb-px overflow-x-auto">
            {tabs.map((tab) => (
              <Link
                key={tab.href}
                href={tab.href}
                className="flex items-center gap-2 px-3 py-2 text-sm border-b-2 border-transparent hover:border-muted-foreground/30 transition-colors whitespace-nowrap"
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
                {tab.count !== undefined && tab.count > 0 && (
                  <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                    {formatNumber(tab.count)}
                  </Badge>
                )}
              </Link>
            ))}
          </nav>
        </div>
      </div>

      {/* Content */}
      {children}
    </div>
  );
}
