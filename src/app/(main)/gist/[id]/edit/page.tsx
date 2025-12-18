'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getGist, updateGist, deleteGist } from '@/app/actions/gists';
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Trash2 } from 'lucide-react';
import type { Gist, GistVisibility } from '@/types';

interface EditGistPageProps {
  params: Promise<{ id: string }>;
}

export default function EditGistPage({ params }: EditGistPageProps) {
  const router = useRouter();
  const [gist, setGist] = useState<Gist | null>(null);
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState<GistVisibility>('public');
  const [files, setFiles] = useState<GistFileEdit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadGist() {
      const resolvedParams = await params;
      const data = await getGist(resolvedParams.id);
      if (!data) {
        router.replace('/gist');
        return;
      }
      setGist(data);
      setDescription(data.description || '');
      setVisibility(data.visibility);
      setFiles(
        data.files?.map((f) => ({
          id: f.id,
          filename: f.filename,
          content: f.content,
        })) || []
      );
      setIsLoading(false);
    }
    loadGist();
  }, [params, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!gist) return;

    setIsSubmitting(true);
    setError(null);

    const validFiles = files.filter((f) => f.filename.trim() && f.content.trim());
    if (validFiles.length === 0) {
      setError('At least one file with content is required');
      setIsSubmitting(false);
      return;
    }

    const result = await updateGist(gist.id, validFiles, {
      description: description || undefined,
      visibility,
    });

    if (result.error) {
      setError(result.error);
      setIsSubmitting(false);
      return;
    }

    router.push(`/gist/${gist.id}`);
  }

  async function handleDelete() {
    if (!gist) return;
    setIsDeleting(true);

    const result = await deleteGist(gist.id);
    if (result.error) {
      setError(result.error);
      setIsDeleting(false);
      return;
    }

    router.push('/gist');
  }

  if (isLoading) {
    return (
      <div className="container max-w-4xl py-8">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl py-8">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Edit gist</CardTitle>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" disabled={isDeleting}>
                <Trash2 className="h-4 w-4 mr-1" />
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete gist?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete this
                  gist and all its files.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {isDeleting ? 'Deleting...' : 'Delete'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
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
                {isSubmitting ? 'Saving...' : 'Update gist'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
