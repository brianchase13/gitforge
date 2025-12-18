import Link from 'next/link';
import { FileCode, Lock, Globe, Star, GitFork, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { formatRelativeTime } from '@/lib/utils';
import type { Gist } from '@/types';

interface GistCardProps {
  gist: Gist;
  showAuthor?: boolean;
}

export function GistCard({ gist, showAuthor = true }: GistCardProps) {
  const firstFile = gist.files?.[0];
  const displayName =
    gist.description || firstFile?.filename || 'Untitled gist';

  return (
    <Card className="hover:border-primary/50 transition-colors">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            {showAuthor && gist.author && (
              <div className="flex items-center gap-2 mb-2">
                <Avatar className="h-5 w-5">
                  <AvatarImage src={gist.author.avatar_url || undefined} />
                  <AvatarFallback className="text-xs">
                    {gist.author.username.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <Link
                  href={`/${gist.author.username}`}
                  className="text-sm text-muted-foreground hover:text-primary"
                >
                  {gist.author.username}
                </Link>
              </div>
            )}
            <Link
              href={`/gist/${gist.id}`}
              className="font-semibold text-primary hover:underline line-clamp-1"
            >
              {displayName}
            </Link>
          </div>
          <Badge variant="outline" className="shrink-0">
            {gist.visibility === 'public' ? (
              <>
                <Globe className="h-3 w-3 mr-1" />
                Public
              </>
            ) : (
              <>
                <Lock className="h-3 w-3 mr-1" />
                Secret
              </>
            )}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {/* File list preview */}
        <div className="flex flex-wrap gap-2 mb-3">
          {gist.files?.slice(0, 5).map((file) => (
            <Badge key={file.id} variant="secondary" className="gap-1">
              <FileCode className="h-3 w-3" />
              {file.filename}
            </Badge>
          ))}
          {gist.files_count > 5 && (
            <Badge variant="secondary">+{gist.files_count - 5} more</Badge>
          )}
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>{formatRelativeTime(gist.created_at)}</span>
          </div>
          {gist.stars_count > 0 && (
            <div className="flex items-center gap-1">
              <Star className="h-3 w-3" />
              <span>{gist.stars_count}</span>
            </div>
          )}
          {gist.forks_count > 0 && (
            <div className="flex items-center gap-1">
              <GitFork className="h-3 w-3" />
              <span>{gist.forks_count}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
