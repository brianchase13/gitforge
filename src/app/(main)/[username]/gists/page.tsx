import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getUserGists } from '@/app/actions/gists';
import { createClient } from '@/lib/supabase/server';
import { GistCard } from '@/components/gists/GistCard';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Plus, FileCode } from 'lucide-react';

interface UserGistsPageProps {
  params: Promise<{ username: string }>;
}

export default async function UserGistsPage({ params }: UserGistsPageProps) {
  const { username } = await params;

  // Get user info
  const supabase = await createClient();
  const { data: user } = await supabase
    .from('users')
    .select('id, username, display_name, avatar_url')
    .eq('username', username)
    .single();

  if (!user) {
    notFound();
  }

  const gists = await getUserGists(username);

  // Check if viewing own gists
  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser();
  const isOwner = currentUser?.id === user.id;

  return (
    <div className="container max-w-4xl py-8">
      {/* User Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Avatar className="h-12 w-12">
            <AvatarImage src={user.avatar_url || undefined} />
            <AvatarFallback>{username.slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Link href={`/${username}`} className="hover:underline">
                {user.display_name || username}
              </Link>
              <span className="text-muted-foreground font-normal">/</span>
              <span>Gists</span>
            </h1>
            <p className="text-muted-foreground">
              {gists.length} {gists.length === 1 ? 'gist' : 'gists'}
            </p>
          </div>
        </div>
        {isOwner && (
          <Button asChild>
            <Link href="/gist/new">
              <Plus className="h-4 w-4 mr-2" />
              New gist
            </Link>
          </Button>
        )}
      </div>

      {/* Gists List */}
      {gists.length === 0 ? (
        <div className="text-center py-12 border rounded-lg bg-muted/20">
          <FileCode className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground mb-4">
            {isOwner ? "You haven't created any gists yet" : `${username} hasn't created any gists yet`}
          </p>
          {isOwner && (
            <Button asChild>
              <Link href="/gist/new">Create your first gist</Link>
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {gists.map((gist) => (
            <GistCard key={gist.id} gist={gist} showAuthor={false} />
          ))}
        </div>
      )}
    </div>
  );
}
