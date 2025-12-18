'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Search,
  BookOpen,
  User as UserIcon,
  CircleDot,
  Star,
  GitFork,
  Loader2,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatRelativeTime } from '@/lib/utils';

interface SearchResults {
  repositories: any[];
  users: any[];
  issues: any[];
  total: number;
}

function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const query = searchParams.get('q') || '';
  const type = searchParams.get('type') || 'repositories';

  const [searchQuery, setSearchQuery] = useState(query);
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (query.length >= 2) {
      setLoading(true);
      fetch(`/api/search?q=${encodeURIComponent(query)}&type=${type}`)
        .then((res) => res.json())
        .then((data) => {
          setResults(data);
          setLoading(false);
        })
        .catch(() => {
          setLoading(false);
        });
    } else {
      setResults(null);
    }
  }, [query, type]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (searchQuery.length >= 2) {
      router.push(`/search?q=${encodeURIComponent(searchQuery)}&type=${type}`);
    }
  }

  function handleTypeChange(newType: string) {
    router.push(`/search?q=${encodeURIComponent(query)}&type=${newType}`);
  }

  return (
    <div className="container py-8 max-w-4xl">
      {/* Search bar */}
      <form onSubmit={handleSearch} className="mb-8">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search repositories, users, issues..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-12 text-lg"
          />
        </div>
      </form>

      {/* Results */}
      {query ? (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold">
              {loading ? (
                'Searching...'
              ) : (
                <>
                  {results?.total || 0} results for &quot;{query}&quot;
                </>
              )}
            </h1>
          </div>

          <Tabs value={type} onValueChange={handleTypeChange}>
            <TabsList>
              <TabsTrigger value="repositories" className="gap-2">
                <BookOpen className="h-4 w-4" />
                Repositories
                {results && (
                  <Badge variant="secondary" className="ml-1">
                    {results.repositories.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="users" className="gap-2">
                <UserIcon className="h-4 w-4" />
                Users
                {results && (
                  <Badge variant="secondary" className="ml-1">
                    {results.users.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="issues" className="gap-2">
                <CircleDot className="h-4 w-4" />
                Issues
                {results && (
                  <Badge variant="secondary" className="ml-1">
                    {results.issues.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                <TabsContent value="repositories" className="mt-6">
                  {results?.repositories.length === 0 ? (
                    <EmptyState
                      icon={BookOpen}
                      title="No repositories found"
                      description={`We couldn't find any repositories matching "${query}"`}
                    />
                  ) : (
                    <div className="space-y-4">
                      {results?.repositories.map((repo) => (
                        <RepositoryResult key={repo.id} repo={repo} />
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="users" className="mt-6">
                  {results?.users.length === 0 ? (
                    <EmptyState
                      icon={UserIcon}
                      title="No users found"
                      description={`We couldn't find any users matching "${query}"`}
                    />
                  ) : (
                    <div className="space-y-4">
                      {results?.users.map((user) => (
                        <UserResult key={user.id} user={user} />
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="issues" className="mt-6">
                  {results?.issues.length === 0 ? (
                    <EmptyState
                      icon={CircleDot}
                      title="No issues found"
                      description={`We couldn't find any issues matching "${query}"`}
                    />
                  ) : (
                    <div className="space-y-4">
                      {results?.issues.map((issue) => (
                        <IssueResult key={issue.id} issue={issue} />
                      ))}
                    </div>
                  )}
                </TabsContent>
              </>
            )}
          </Tabs>
        </div>
      ) : (
        <div className="text-center py-12">
          <Search className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">Search GitForge</h2>
          <p className="text-muted-foreground">
            Find repositories, users, and issues across all of GitForge
          </p>
        </div>
      )}
    </div>
  );
}

function RepositoryResult({ repo }: { repo: any }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-base">
              <Link
                href={`/${repo.owner?.username}/${repo.name}`}
                className="hover:text-primary hover:underline"
              >
                <span className="text-muted-foreground">{repo.owner?.username}/</span>
                {repo.name}
              </Link>
            </CardTitle>
            {repo.description && (
              <CardDescription className="mt-1">{repo.description}</CardDescription>
            )}
          </div>
          {repo.visibility === 'public' && (
            <Badge variant="outline">Public</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Star className="h-4 w-4" />
            {repo.stars_count}
          </span>
          <span className="flex items-center gap-1">
            <GitFork className="h-4 w-4" />
            {repo.forks_count}
          </span>
          <span>Updated {formatRelativeTime(repo.updated_at)}</span>
        </div>
      </CardContent>
    </Card>
  );
}

function UserResult({ user }: { user: any }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 py-4">
        <Avatar className="h-12 w-12">
          <AvatarImage src={user.avatar_url || undefined} alt={user.username} />
          <AvatarFallback>{user.username?.slice(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div>
          <Link
            href={`/${user.username}`}
            className="font-medium hover:text-primary hover:underline"
          >
            {user.display_name || user.username}
          </Link>
          <p className="text-sm text-muted-foreground">@{user.username}</p>
          {user.bio && (
            <p className="text-sm text-muted-foreground mt-1 line-clamp-1">{user.bio}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function IssueResult({ issue }: { issue: any }) {
  const ownerUsername = issue.repository?.owner?.username;
  const repoName = issue.repository?.name;

  return (
    <Card>
      <CardContent className="py-4">
        <div className="flex items-start gap-3">
          <CircleDot
            className={`h-5 w-5 mt-0.5 ${
              issue.state === 'open' ? 'text-green-600' : 'text-purple-600'
            }`}
          />
          <div>
            <Link
              href={`/${ownerUsername}/${repoName}/issues/${issue.number}`}
              className="font-medium hover:text-primary hover:underline"
            >
              {issue.title}
            </Link>
            <p className="text-sm text-muted-foreground mt-1">
              #{issue.number} opened {formatRelativeTime(issue.created_at)} in{' '}
              <Link
                href={`/${ownerUsername}/${repoName}`}
                className="hover:text-primary hover:underline"
              >
                {ownerUsername}/{repoName}
              </Link>
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <div className="text-center py-12">
      <Icon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
      <h3 className="text-lg font-medium mb-2">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="container py-8 max-w-4xl">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </div>
      }
    >
      <SearchContent />
    </Suspense>
  );
}
