'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Loader2, Plus, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { createWikiPage } from '@/app/actions/wiki';
import { getRepository } from '@/app/actions/repositories';

interface NewWikiPageProps {
  params: Promise<{
    username: string;
    repo: string;
  }>;
}

export default function NewWikiPage({ params }: NewWikiPageProps) {
  const searchParams = useSearchParams();
  const defaultTitle = searchParams.get('title') || '';
  const defaultSlug = searchParams.get('slug') || '';

  const [title, setTitle] = useState(defaultTitle);
  const [body, setBody] = useState('');
  const [slug, setSlug] = useState(defaultSlug);
  const [repositoryId, setRepositoryId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resolvedParams, setResolvedParams] = useState<{
    username: string;
    repo: string;
  } | null>(null);

  const router = useRouter();

  useEffect(() => {
    params.then((p) => {
      setResolvedParams(p);
      loadRepository(p);
    });
  }, [params]);

  async function loadRepository(p: { username: string; repo: string }) {
    const repository = await getRepository(p.username, p.repo);
    if (!repository) {
      setError('Repository not found');
      setLoading(false);
      return;
    }
    setRepositoryId(repository.id);
    setLoading(false);
  }

  function generateSlug(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }

  function handleTitleChange(value: string) {
    setTitle(value);
    if (!defaultSlug) {
      setSlug(generateSlug(value));
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!repositoryId || !resolvedParams) return;

    setCreating(true);
    setError(null);

    const result = await createWikiPage(
      repositoryId,
      title,
      body,
      slug || undefined
    );

    if (result.error) {
      setError(result.error);
      setCreating(false);
      return;
    }

    if (result.page) {
      router.push(
        `/${resolvedParams.username}/${resolvedParams.repo}/wiki/${result.page.slug}`
      );
    }
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

  if (error && !repositoryId) {
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
        <Link href={`/${resolvedParams?.username}/${resolvedParams?.repo}/wiki`}>
          <Button variant="ghost" size="sm" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to wiki
          </Button>
        </Link>
        <h1 className="text-xl font-bold">Create new page</h1>
      </div>

      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleCreate} className="space-y-4">
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
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="Page title"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="slug">URL slug</Label>
              <Input
                id="slug"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="page-url-slug"
              />
              <p className="text-xs text-muted-foreground">
                The URL-friendly version of the title. Will be auto-generated if
                left empty.
              </p>
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

            <div className="flex items-center justify-end gap-2 pt-4">
              <Link
                href={`/${resolvedParams?.username}/${resolvedParams?.repo}/wiki`}
              >
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </Link>
              <Button
                type="submit"
                disabled={creating || !title.trim() || !body.trim()}
              >
                {creating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    Create page
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
