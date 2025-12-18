'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { addPRComment } from '@/app/actions/pull-requests';

interface PRCommentFormProps {
  pullRequestId: string;
}

export function PRCommentForm({ pullRequestId }: PRCommentFormProps) {
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append('body', body);

    const result = await addPRComment(pullRequestId, formData);

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    setBody('');
    setLoading(false);
    router.refresh();
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit}>
          {error && (
            <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md mb-4">
              {error}
            </div>
          )}
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Leave a comment..."
            rows={4}
            className="mb-4"
          />
          <div className="flex items-center justify-end gap-2">
            <Button type="submit" disabled={loading || !body.trim()}>
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              Comment
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
