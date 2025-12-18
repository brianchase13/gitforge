'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2, Loader2 } from 'lucide-react';
import { deleteBranchProtectionRule } from '@/app/actions/branch-protection';
import { Button } from '@/components/ui/button';

interface DeleteProtectionButtonProps {
  ruleId: string;
  pattern: string;
  username: string;
  repoName: string;
}

export function DeleteProtectionButton({
  ruleId,
  pattern,
  username,
  repoName,
}: DeleteProtectionButtonProps) {
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const router = useRouter();

  async function handleDelete() {
    if (!confirming) {
      setConfirming(true);
      return;
    }

    setLoading(true);

    const result = await deleteBranchProtectionRule(ruleId);

    if (result.error) {
      alert(result.error);
      setLoading(false);
      setConfirming(false);
      return;
    }

    router.refresh();
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-2">
        <Button
          variant="destructive"
          size="sm"
          onClick={handleDelete}
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            'Confirm'
          )}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setConfirming(false)}
          disabled={loading}
        >
          Cancel
        </Button>
      </div>
    );
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      className="text-destructive hover:text-destructive"
      onClick={handleDelete}
    >
      <Trash2 className="h-4 w-4" />
    </Button>
  );
}
