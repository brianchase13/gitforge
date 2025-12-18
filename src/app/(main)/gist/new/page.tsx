'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createGist } from '@/app/actions/gists';
import { GistEditor, type GistFileEdit } from '@/components/gists/GistEditor';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { GistVisibility } from '@/types';

export default function NewGistPage() {
  const router = useRouter();
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState<GistVisibility>('public');
  const [files, setFiles] = useState<GistFileEdit[]>([{ filename: '', content: '' }]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    // Validate files
    const validFiles = files.filter((f) => f.filename.trim() && f.content.trim());
    if (validFiles.length === 0) {
      setError('At least one file with content is required');
      setIsSubmitting(false);
      return;
    }

    const result = await createGist(validFiles, {
      description: description || undefined,
      visibility,
    });

    if (result.error) {
      setError(result.error);
      setIsSubmitting(false);
      return;
    }

    if (result.gist) {
      router.push(`/gist/${result.gist.id}`);
    }
  }

  return (
    <div className="container max-w-4xl py-8">
      <Card>
        <CardHeader>
          <CardTitle>Create a new gist</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">
                {error}
              </div>
            )}

            <div className="flex gap-4">
              <div className="flex-1">
                <Label htmlFor="description">Gist description (optional)</Label>
                <Input
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What is this gist about?"
                  className="mt-1.5"
                />
              </div>
              <div className="w-40">
                <Label>Visibility</Label>
                <Select
                  value={visibility}
                  onValueChange={(v) => setVisibility(v as GistVisibility)}
                >
                  <SelectTrigger className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">Public</SelectItem>
                    <SelectItem value="secret">Secret</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="mb-3 block">Files</Label>
              <GistEditor files={files} onChange={setFiles} />
            </div>

            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Creating...' : 'Create gist'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
