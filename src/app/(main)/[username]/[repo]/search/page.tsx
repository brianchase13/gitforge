import { Suspense } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Search, FileCode, AlertCircle, Loader2 } from 'lucide-react';
import { getRepository } from '@/app/actions/repositories';
import { searchRepository, SearchResult } from '@/lib/git/search';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

interface SearchPageProps {
  params: Promise<{
    username: string;
    repo: string;
  }>;
  searchParams: Promise<{
    q?: string;
    path?: string;
    case?: string;
    word?: string;
    regex?: string;
  }>;
}

export default async function SearchPage({
  params,
  searchParams,
}: SearchPageProps) {
  const { username, repo: repoName } = await params;
  const query = await searchParams;

  const repository = await getRepository(username, repoName);

  if (!repository) {
    notFound();
  }

  const searchQuery = query.q || '';
  const pathFilter = query.path || '';
  const caseSensitive = query.case === 'true';
  const wholeWord = query.word === 'true';
  const useRegex = query.regex === 'true';

  return (
    <div className="container py-6">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Search code in this repository
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form method="GET" className="space-y-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  name="q"
                  placeholder="Search code..."
                  defaultValue={searchQuery}
                  className="pl-10"
                />
              </div>
              <Button type="submit">Search</Button>
            </div>

            <div className="flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="case"
                  name="case"
                  value="true"
                  defaultChecked={caseSensitive}
                />
                <Label htmlFor="case">Case sensitive</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="word"
                  name="word"
                  value="true"
                  defaultChecked={wholeWord}
                />
                <Label htmlFor="word">Whole word</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="regex"
                  name="regex"
                  value="true"
                  defaultChecked={useRegex}
                />
                <Label htmlFor="regex">Regular expression</Label>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  name="path"
                  placeholder="Filter by path (e.g., src/)"
                  defaultValue={pathFilter}
                  className="w-48 h-8"
                />
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      {searchQuery ? (
        <Suspense
          fallback={
            <Card>
              <CardContent className="py-12 text-center">
                <Loader2 className="h-8 w-8 mx-auto animate-spin text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Searching...</p>
              </CardContent>
            </Card>
          }
        >
          <SearchResults
            storagePath={repository.storage_path}
            defaultBranch={repository.default_branch}
            query={searchQuery}
            pathFilter={pathFilter}
            caseSensitive={caseSensitive}
            wholeWord={wholeWord}
            useRegex={useRegex}
            username={username}
            repoName={repoName}
          />
        </Suspense>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <Search className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Search code</h3>
            <p className="text-muted-foreground">
              Enter a search term to find code in this repository.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

async function SearchResults({
  storagePath,
  defaultBranch,
  query,
  pathFilter,
  caseSensitive,
  wholeWord,
  useRegex,
  username,
  repoName,
}: {
  storagePath: string;
  defaultBranch: string;
  query: string;
  pathFilter: string;
  caseSensitive: boolean;
  wholeWord: boolean;
  useRegex: boolean;
  username: string;
  repoName: string;
}) {
  let results;
  let error: string | null = null;

  try {
    results = await searchRepository(storagePath, defaultBranch, query, {
      caseSensitive,
      wholeWord,
      regex: useRegex,
      path: pathFilter || undefined,
    });
  } catch (e: any) {
    error = e.message || 'Search failed';
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <AlertCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
          <h3 className="text-lg font-medium mb-2">Search error</h3>
          <p className="text-muted-foreground">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (!results || results.results.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Search className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No results found</h3>
          <p className="text-muted-foreground">
            No code matching "{query}" was found.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Group results by file
  const groupedResults = results.results.reduce(
    (acc, result) => {
      if (!acc[result.path]) {
        acc[result.path] = [];
      }
      acc[result.path].push(result);
      return acc;
    },
    {} as Record<string, SearchResult[]>
  );

  const fileCount = Object.keys(groupedResults).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Found <strong>{results.totalMatches}</strong> matches in{' '}
          <strong>{fileCount}</strong> files
          {results.truncated && (
            <Badge variant="secondary" className="ml-2">
              Results truncated
            </Badge>
          )}
        </p>
        <p className="text-sm text-muted-foreground">
          {results.filesSearched} files searched
        </p>
      </div>

      {Object.entries(groupedResults).map(([path, matches]) => (
        <Card key={path}>
          <CardHeader className="py-3">
            <div className="flex items-center gap-2">
              <FileCode className="h-4 w-4 text-muted-foreground" />
              <Link
                href={`/${username}/${repoName}/blob/${defaultBranch}/${path}`}
                className="font-mono text-sm hover:text-primary hover:underline"
              >
                {path}
              </Link>
              <Badge variant="outline" className="ml-auto">
                {matches.length} {matches.length === 1 ? 'match' : 'matches'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="border-t divide-y">
              {matches.map((match, idx) => (
                <Link
                  key={idx}
                  href={`/${username}/${repoName}/blob/${defaultBranch}/${path}#L${match.lineNumber}`}
                  className="block hover:bg-muted/50 transition-colors"
                >
                  <div className="flex font-mono text-sm">
                    <span className="w-12 py-2 text-right pr-3 text-muted-foreground bg-muted/30 border-r select-none">
                      {match.lineNumber}
                    </span>
                    <span className="flex-1 py-2 pl-3 pr-4 overflow-x-auto whitespace-pre">
                      <HighlightedLine
                        content={match.lineContent}
                        matchStart={match.matchStart}
                        matchEnd={match.matchEnd}
                      />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function HighlightedLine({
  content,
  matchStart,
  matchEnd,
}: {
  content: string;
  matchStart: number;
  matchEnd: number;
}) {
  const before = content.substring(0, matchStart);
  const match = content.substring(matchStart, matchEnd);
  const after = content.substring(matchEnd);

  return (
    <>
      {before}
      <mark className="bg-yellow-200 dark:bg-yellow-900 text-inherit px-0.5 rounded">
        {match}
      </mark>
      {after}
    </>
  );
}
