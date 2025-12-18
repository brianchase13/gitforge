'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { notFound } from 'next/navigation';
import { Loader2, AlertTriangle, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { updateRepository, deleteRepository } from '@/app/actions/repositories';

interface SettingsPageProps {
  params: Promise<{
    username: string;
    repo: string;
  }>;
}

export default function SettingsPage({ params }: SettingsPageProps) {
  const [loading, setLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [resolvedParams, setResolvedParams] = useState<{
    username: string;
    repo: string;
  } | null>(null);

  // Settings state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [hasIssues, setHasIssues] = useState(true);
  const [hasPullRequests, setHasPullRequests] = useState(true);
  const [isArchived, setIsArchived] = useState(false);

  const router = useRouter();

  // Resolve params on mount
  if (!resolvedParams) {
    params.then((p) => {
      setResolvedParams(p);
      setName(p.repo);
    });
    return (
      <div className="container max-w-4xl py-8">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  const { username, repo: repoName } = resolvedParams;

  async function handleSave(repositoryId: string) {
    setLoading(true);
    setError(null);

    const result = await updateRepository(repositoryId, {
      name,
      description: description || undefined,
      has_issues: hasIssues,
      has_pull_requests: hasPullRequests,
      is_archived: isArchived,
    });

    if (result.error) {
      setError(result.error);
    } else if (name !== repoName) {
      router.push(`/${username}/${name}/settings`);
    }

    setLoading(false);
  }

  async function handleDelete(repositoryId: string) {
    setDeleteLoading(true);

    const result = await deleteRepository(repositoryId);

    if (result.error) {
      setError(result.error);
      setDeleteLoading(false);
    } else {
      router.push(`/${username}`);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">General Settings</h1>

      {error && (
        <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md mb-6">
          {error}
        </div>
      )}

      {/* General settings */}
      <Card>
        <CardHeader>
          <CardTitle>General</CardTitle>
          <CardDescription>
            Configure your repository settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name">Repository name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Repository name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="A short description of your repository"
              rows={3}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="issues">Issues</Label>
              <p className="text-sm text-muted-foreground">
                Allow users to report bugs and request features
              </p>
            </div>
            <Switch
              id="issues"
              checked={hasIssues}
              onCheckedChange={setHasIssues}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="prs">Pull requests</Label>
              <p className="text-sm text-muted-foreground">
                Allow users to contribute code changes
              </p>
            </div>
            <Switch
              id="prs"
              checked={hasPullRequests}
              onCheckedChange={setHasPullRequests}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="archived">Archive repository</Label>
              <p className="text-sm text-muted-foreground">
                Mark this repository as archived and read-only
              </p>
            </div>
            <Switch
              id="archived"
              checked={isArchived}
              onCheckedChange={setIsArchived}
            />
          </div>

          <div className="pt-4">
            <Button disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save changes
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Danger zone */}
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive">Danger Zone</CardTitle>
          <CardDescription>
            These actions are irreversible. Please be careful.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 border rounded-md">
            <div>
              <h4 className="font-medium">Delete this repository</h4>
              <p className="text-sm text-muted-foreground">
                Once you delete a repository, there is no going back.
              </p>
            </div>
            <Button
              variant="destructive"
              onClick={() => setShowDeleteConfirm(true)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
          </div>

          {showDeleteConfirm && (
            <div className="p-4 border border-destructive rounded-md bg-destructive/5">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-destructive">
                      Are you absolutely sure?
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      This action cannot be undone. This will permanently delete the{' '}
                      <strong>{repoName}</strong> repository and all of its data.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirm">
                      Please type <strong>{username}/{repoName}</strong> to confirm.
                    </Label>
                    <Input
                      id="confirm"
                      value={confirmDelete}
                      onChange={(e) => setConfirmDelete(e.target.value)}
                      placeholder={`${username}/${repoName}`}
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="destructive"
                      disabled={
                        confirmDelete !== `${username}/${repoName}` ||
                        deleteLoading
                      }
                    >
                      {deleteLoading && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      I understand, delete this repository
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowDeleteConfirm(false);
                        setConfirmDelete('');
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
