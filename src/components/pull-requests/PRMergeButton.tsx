'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, GitMerge, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { mergePullRequest } from '@/app/actions/pull-requests';

interface PRMergeButtonProps {
  pullRequestId: string;
  username: string;
  repoName: string;
}

export function PRMergeButton({
  pullRequestId,
  username,
  repoName,
}: PRMergeButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleMerge() {
    setLoading(true);
    setError(null);

    const result = await mergePullRequest(pullRequestId);

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    setLoading(false);
    router.refresh();
  }

  return (
    <div>
      {error && (
        <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md mb-4">
          {error}
        </div>
      )}
      <div className="flex items-center gap-0.5">
        <Button
          onClick={handleMerge}
          disabled={loading}
          className="rounded-r-none bg-green-600 hover:bg-green-700"
        >
          {loading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <GitMerge className="mr-2 h-4 w-4" />
          )}
          Merge pull request
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="default"
              className="rounded-l-none px-2 bg-green-600 hover:bg-green-700 border-l border-green-700"
              disabled={loading}
            >
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleMerge}>
              <GitMerge className="mr-2 h-4 w-4" />
              Create a merge commit
            </DropdownMenuItem>
            <DropdownMenuItem disabled>
              Squash and merge (coming soon)
            </DropdownMenuItem>
            <DropdownMenuItem disabled>
              Rebase and merge (coming soon)
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
