'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { GitFork, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { forkRepository } from '@/app/actions/repositories';

interface ForkButtonProps {
  repositoryId: string;
  isLoggedIn: boolean;
  isFork?: boolean;
  isOwner?: boolean;
  forkCount: number;
}

export function ForkButton({
  repositoryId,
  isLoggedIn,
  isFork,
  isOwner,
  forkCount,
}: ForkButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleFork() {
    if (!isLoggedIn) {
      router.push('/login');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await forkRepository(repositoryId);
      if (result?.error) {
        setError(result.error);
      }
      // If successful, forkRepository redirects
    } catch (err) {
      setError('Failed to fork repository');
    } finally {
      setLoading(false);
    }
  }

  // Don't show fork button on your own repos or if it's already a fork
  const canFork = !isOwner && !isFork;

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        className="gap-2"
        onClick={handleFork}
        disabled={loading || !canFork}
        title={
          isOwner
            ? "You can't fork your own repository"
            : isFork
              ? 'This is already a fork'
              : isLoggedIn
                ? 'Fork this repository'
                : 'Sign in to fork this repository'
        }
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <GitFork className="h-4 w-4" />
        )}
        Fork
        <span className="ml-1 px-2 py-0.5 text-xs rounded-full bg-muted">
          {forkCount}
        </span>
      </Button>
      {error && (
        <span className="text-xs text-destructive">{error}</span>
      )}
    </div>
  );
}
