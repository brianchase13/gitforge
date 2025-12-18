'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, GitPullRequest, FileEdit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { TemplateSelector } from '@/components/TemplateSelector';
import { createPullRequest } from '@/app/actions/pull-requests';
import type { Template } from '@/types';

interface PRCreateFormProps {
  repositoryId: string;
  baseBranch: string;
  headBranch: string;
  defaultTitle: string;
  username: string;
  repoName: string;
  templates?: Template[];
}

export function PRCreateForm({
  repositoryId,
  baseBranch,
  headBranch,
  defaultTitle,
  username,
  repoName,
  templates = [],
}: PRCreateFormProps) {
  const [title, setTitle] = useState(defaultTitle);
  const [body, setBody] = useState('');
  const [isDraft, setIsDraft] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function handleTemplateSelect(template: Template) {
    setSelectedTemplate(template);
    if (template.title_template) {
      setTitle(template.title_template);
    }
    setBody(template.body);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append('title', title);
    formData.append('body', body);
    formData.append('head_branch', headBranch);
    formData.append('base_branch', baseBranch);
    formData.append('draft', isDraft.toString());

    const result = await createPullRequest(repositoryId, formData);

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    if (result.pullRequest) {
      router.push(`/${username}/${repoName}/pulls/${result.pullRequest.number}`);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <GitPullRequest className="h-5 w-5" />
          Create pull request
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
              {error}
            </div>
          )}

          {templates.length > 0 && (
            <div className="space-y-2">
              <Label>Template</Label>
              <TemplateSelector
                templates={templates}
                onSelect={handleTemplateSelect}
                selectedTemplate={selectedTemplate}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Pull request title"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="body">Description</Label>
            <Textarea
              id="body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Describe your changes..."
              rows={6}
            />
            <p className="text-xs text-muted-foreground">
              Markdown formatting is supported.
            </p>
          </div>

          <div className="flex items-center space-x-2 pt-2">
            <Checkbox
              id="draft"
              checked={isDraft}
              onCheckedChange={(checked) => setIsDraft(checked === true)}
            />
            <div className="grid gap-1.5 leading-none">
              <Label
                htmlFor="draft"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Create as draft
              </Label>
              <p className="text-xs text-muted-foreground">
                Draft pull requests cannot be merged until marked as ready for review.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !title.trim()}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : isDraft ? (
                <>
                  <FileEdit className="mr-2 h-4 w-4" />
                  Create draft pull request
                </>
              ) : (
                <>
                  <GitPullRequest className="mr-2 h-4 w-4" />
                  Create pull request
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
