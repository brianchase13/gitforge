import { getPublicGists } from '@/app/actions/gists';
import { GistCard } from '@/components/gists/GistCard';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import Link from 'next/link';

export default async function GistDiscoverPage() {
  const gists = await getPublicGists(50);

  return (
    <div className="container max-w-4xl py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Discover Gists</h1>
          <p className="text-muted-foreground mt-1">
            Explore public code snippets shared by the community
          </p>
        </div>
        <Button asChild>
          <Link href="/gist/new">
            <Plus className="h-4 w-4 mr-2" />
            New gist
          </Link>
        </Button>
      </div>

      {gists.length === 0 ? (
        <div className="text-center py-12 border rounded-lg bg-muted/20">
          <p className="text-muted-foreground mb-4">No public gists yet</p>
          <Button asChild>
            <Link href="/gist/new">Create the first gist</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {gists.map((gist) => (
            <GistCard key={gist.id} gist={gist} />
          ))}
        </div>
      )}
    </div>
  );
}
