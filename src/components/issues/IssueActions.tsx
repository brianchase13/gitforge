'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, CircleDot, CheckCircle2, Lock, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { updateIssue } from '@/app/actions/issues';

interface IssueActionsProps {
  issueId: string;
  currentState: 'open' | 'closed';
  username: string;
  repoName: string;
}

export function IssueActions({
  issueId,
  currentState,
  username,
  repoName,
}: IssueActionsProps) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleStateChange() {
    setLoading(true);
    const newState = currentState === 'open' ? 'closed' : 'open';

    const result = await updateIssue(issueId, { state: newState });

    if (result.error) {
      console.error(result.error);
    }

    setLoading(false);
    router.refresh();
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Actions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <Button
          variant="outline"
          className="w-full justify-start gap-2"
          onClick={handleStateChange}
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : currentState === 'open' ? (
            <CheckCircle2 className="h-4 w-4 text-purple-600" />
          ) : (
            <CircleDot className="h-4 w-4 text-green-600" />
          )}
          {currentState === 'open' ? 'Close issue' : 'Reopen issue'}
        </Button>

        <Button
          variant="outline"
          className="w-full justify-start gap-2"
          disabled
        >
          <Lock className="h-4 w-4" />
          Lock conversation
        </Button>

        <Button
          variant="outline"
          className="w-full justify-start gap-2 text-destructive hover:text-destructive"
          disabled
        >
          <Trash2 className="h-4 w-4" />
          Delete issue
        </Button>
      </CardContent>
    </Card>
  );
}
