'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2, Save, Trash2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { updateWikiPage, deleteWikiPage, getWikiPage } from '@/app/actions/wiki';
import { getRepository } from '@/app/actions/repositories';

interface WikiPageEditProps {
  params: Promise<{
    username: string;
    repo: string;
    slug: string;
  }>;
}

export default function WikiPageEdit({ params }: WikiPageEditProps) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [pageId, setPageId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resolvedParams, setResolvedParams] = useState<{
    username: string;
    repo: string;
    slug: string;
  } | null>(null);

  const router = useRouter();

  useEffect(() => {
    params.then((p) => {
      setResolvedParams(p);
      loadPage(p);
    });
  }, [params]);

  async function loadPage(p: { username: string; repo: string; slug: string }) {
    const repository = await getRepository(p.username, p.repo);
    if (!repository) {
      setError('Repository not found');
      setLoading(false);
      return;
    }

    const page = await getWikiPage(repository.id, p.slug);
    if (!page) {
      setError('Page not found');
      setLoading(false);
      return;
    }

    setTitle(page.title);
    setBody(page.body);
    setPageId(page.id);
    setLoading(false);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!pageId || !resolvedParams) return;

    setSaving(true);
    setError(null);

    const result = await updateWikiPage(pageId, { title, body });

    if (result.error) {
      setError(result.error);
      setSaving(false);
      return;
    }

    router.push(`/${resolvedParams.username}/${resolvedParams.repo}/wiki/${resolvedParams.slug}`);
    router.refresh();
  }

  async function handleDelete() {
    if (!pageId || !resolvedParams) return;

    setDeleting(true);
    const result = await deleteWikiPage(pageId);

    if (result.error) {
      setError(result.error);
      setDeleting(false);
      return;
    }

    router.push(`/${resolvedParams.username}/${resolvedParams.repo}/wiki`);
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (error && !pageId) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-destructive">{error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Link
          href={`/${resolvedParams?.username}/${resolvedParams?.repo}/wiki/${resolvedParams?.slug}`}
        >
          <Button variant="ghost" size="sm" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to page
          </Button>
        </Link>
        <h1 className="text-xl font-bold">Edit page</h1>
      </div>

      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSave} className="space-y-4">
            {error && (
              <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Page title"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="body">Content</Label>
              <Textarea
                id="body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Write your page content here. Markdown is supported."
                rows={20}
                className="font-mono text-sm"
                required
              />
              <p className="text-xs text-muted-foreground">
                Supports Markdown formatting
              </p>
            </div>

            <div className="flex items-center justify-between pt-4">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="gap-2"
                    disabled={deleting}
                  >
                    {deleting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                    Delete page
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete wiki page?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete
                      the page "{title}".
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete}>
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              <div className="flex items-center gap-2">
                <Link
                  href={`/${resolvedParams?.username}/${resolvedParams?.repo}/wiki/${resolvedParams?.slug}`}
                >
                  <Button type="button" variant="outline">
                    Cancel
                  </Button>
                </Link>
                <Button type="submit" disabled={saving || !title.trim() || !body.trim()}>
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save page
                    </>
                  )}
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
