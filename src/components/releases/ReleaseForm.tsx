'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { createRelease } from '@/app/actions/releases';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';

interface ReleaseFormProps {
  repositoryId: string;
  branches: string[];
  existingTags: string[];
  defaultTag?: string;
  defaultBranch: string;
  username: string;
  repoName: string;
}

export function ReleaseForm({
  repositoryId,
  branches,
  existingTags,
  defaultTag,
  defaultBranch,
  username,
  repoName,
}: ReleaseFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError(null);

    const tagName = formData.get('tag_name') as string;
    const targetCommitish = formData.get('target') as string;
    const name = formData.get('name') as string;
    const body = formData.get('body') as string;
    const draft = formData.get('draft') === 'on';
    const prerelease = formData.get('prerelease') === 'on';

    if (!tagName) {
      setError('Tag name is required');
      setLoading(false);
      return;
    }

    if (existingTags.includes(tagName)) {
      setError('A release with this tag already exists');
      setLoading(false);
      return;
    }

    const result = await createRelease(repositoryId, {
      tagName,
      targetCommitish,
      name: name || tagName,
      body,
      draft,
      prerelease,
    });

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    router.push(`/${username}/${repoName}/releases`);
  }

  return (
    <form action={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-3 bg-destructive/10 text-destructive rounded-md text-sm">
          {error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="tag_name">Tag version *</Label>
          <Input
            id="tag_name"
            name="tag_name"
            placeholder="v1.0.0"
            defaultValue={defaultTag}
            required
          />
          <p className="text-xs text-muted-foreground">
            Choose an existing tag or create a new one on publish
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="target">Target</Label>
          <select
            id="target"
            name="target"
            defaultValue={defaultBranch}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            {branches.map((branch) => (
              <option key={branch} value={branch}>
                {branch}
              </option>
            ))}
          </select>
          <p className="text-xs text-muted-foreground">
            The branch to create the tag from
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="name">Release title</Label>
        <Input
          id="name"
          name="name"
          placeholder="Release title (optional)"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="body">Describe this release</Label>
        <Textarea
          id="body"
          name="body"
          rows={10}
          placeholder="Describe what's changed in this release..."
          className="font-mono text-sm"
        />
        <p className="text-xs text-muted-foreground">
          Supports Markdown formatting
        </p>
      </div>

      <div className="space-y-4 pt-4 border-t">
        <div className="flex items-center gap-2">
          <Checkbox id="prerelease" name="prerelease" />
          <Label htmlFor="prerelease" className="font-normal">
            Set as a pre-release
          </Label>
        </div>
        <p className="text-xs text-muted-foreground ml-6">
          This release will be labeled as non-production ready
        </p>

        <div className="flex items-center gap-2">
          <Checkbox id="draft" name="draft" />
          <Label htmlFor="draft" className="font-normal">
            Save as draft
          </Label>
        </div>
        <p className="text-xs text-muted-foreground ml-6">
          Drafts are not visible to users until published
        </p>
      </div>

      <div className="flex items-center gap-3 pt-4">
        <Button type="submit" disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Publish release
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
