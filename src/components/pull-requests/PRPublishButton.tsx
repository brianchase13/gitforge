'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { publishDraft } from '@/app/actions/pull-requests';

interface PRPublishButtonProps {
  pullRequestId: string;
}

export function PRPublishButton({ pullRequestId }: PRPublishButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handlePublish() {
    setLoading(true);
    setError(null);

    const result = await publishDraft(pullRequestId);

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    router.refresh();
  }

  return (
    <div className="space-y-2">
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
      <Button
        onClick={handlePublish}
        disabled={loading}
        className="w-full"
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Publishing...
          </>
        ) : (
          <>
            <CheckCircle className="mr-2 h-4 w-4" />
            Ready for review
          </>
        )}
      </Button>
    </div>
  );
}
