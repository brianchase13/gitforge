'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Loader2, Lock, Globe, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { createRepository } from '@/app/actions/repositories';

export default function NewRepositoryPage() {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState<'public' | 'private'>('public');
  const [initReadme, setInitReadme] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isValidName = /^[a-zA-Z0-9._-]+$/.test(name) && name.length <= 100;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append('name', name);
    formData.append('description', description);
    formData.append('visibility', visibility);
    formData.append('init_readme', initReadme.toString());

    const result = await createRepository(formData);

    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
  }

  return (
    <div className="container max-w-2xl py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Create a new repository</h1>
        <p className="text-muted-foreground mt-1">
          A repository contains all project files, including the revision history.
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Repository details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {error && (
              <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
                {error}
              </div>
            )}

            {/* Repository name */}
            <div className="space-y-2">
              <Label htmlFor="name">
                Repository name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="my-awesome-project"
                required
                autoComplete="off"
              />
              {name && !isValidName && (
                <p className="text-xs text-destructive">
                  Repository name can only contain letters, numbers, dots, hyphens, and underscores
                </p>
              )}
              {name && isValidName && (
                <p className="text-xs text-muted-foreground">
                  Great name!
                </p>
              )}
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="A short description of your repository"
              />
            </div>

            <Separator />

            {/* Visibility */}
            <div className="space-y-4">
              <Label>Visibility</Label>
              <div className="grid gap-3">
                <label
                  className={`flex items-start gap-4 p-4 border rounded-lg cursor-pointer transition-colors ${
                    visibility === 'public' ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                  }`}
                >
                  <input
                    type="radio"
                    name="visibility"
                    value="public"
                    checked={visibility === 'public'}
                    onChange={() => setVisibility('public')}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4" />
                      <span className="font-medium">Public</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Anyone on the internet can see this repository. You choose who can commit.
                    </p>
                  </div>
                </label>

                <label
                  className={`flex items-start gap-4 p-4 border rounded-lg cursor-pointer transition-colors ${
                    visibility === 'private' ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                  }`}
                >
                  <input
                    type="radio"
                    name="visibility"
                    value="private"
                    checked={visibility === 'private'}
                    onChange={() => setVisibility('private')}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Lock className="h-4 w-4" />
                      <span className="font-medium">Private</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      You choose who can see and commit to this repository.
                    </p>
                  </div>
                </label>
              </div>
            </div>

            <Separator />

            {/* Initialize repository */}
            <div className="space-y-4">
              <Label>Initialize this repository with:</Label>
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={initReadme}
                  onChange={(e) => setInitReadme(e.target.checked)}
                  className="mt-1"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4" />
                    <span className="font-medium">Add a README file</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    This is where you can write a long description for your project.
                  </p>
                </div>
              </label>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-end gap-4 mt-6">
          <Link href="/">
            <Button variant="outline" type="button">
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={loading || !name || !isValidName}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create repository
          </Button>
        </div>
      </form>
    </div>
  );
}
